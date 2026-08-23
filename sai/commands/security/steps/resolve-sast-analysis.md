# Security Step — Resolve SAST Analysis

Active step: resolve-sast-analysis. Apply taint-tracking and pattern detection across the flaw categories below against the selected scope, then report the `resolve-sast-analysis` progress event per the worker contract.

### Phase 2: SAST — Static Analysis

Apply taint-tracking and pattern detection across the categories below. For each flaw:
- File path + line number
- Flaw category (standard name)
- CWE ID (most specific) **only if the mapping is direct and obvious**
- Severity
- Taint flow (source → propagation → sink) for injection-class flaws
- Exploit scenario (one concrete sentence describing an attack **on the current code**)
- Remediation code

#### Flaw Categories

**Injection**
- SQL Injection (CWE-89) — string-concatenated/interpolated SQL in any layer, raw ORM queries, Dapper `Execute`/`Query`
- LDAP Injection — unsanitized directory lookups
- XML / XXE (CWE-611) — user-controlled XML parsing without entity disabling
- Command Injection (CWE-78) — `Process.Start`, `os.system`, `exec()`, `shell=True` with user data
- Code Injection (CWE-94) — `eval()`, `exec()`, dynamic class loading with user input
- Log Injection — user data written to logs without sanitization
- HTTP Response Splitting — user-controlled response headers

**Cryptography**
- Broken Algorithm (CWE-327) — MD5, SHA1, DES, RC4 for security purposes
- Insufficient Key Size — RSA < 2048, AES < 128
- Hardcoded Cryptographic Key (CWE-321) — literal keys; embedded `.prv`/`.pem`/`.pfx` files
- Predictable Random (CWE-338) — `Math.random()`, `System.Random`, `random.random()` for tokens/nonces/passwords
- Cleartext Storage (CWE-312) — plaintext passwords/keys at rest
- Cleartext Transmission (CWE-319) — HTTP for sensitive data

**Authentication & Session**
- Improper Authentication (CWE-287)
- Credentials Management (CWE-255, CWE-798) — hardcoded passwords/API keys/tokens
- Session Fixation (CWE-384) — session ID not regenerated post-login
- Cookie Security Flags (CWE-1004) — missing HttpOnly/Secure/SameSite
- Weak Password Policy

**Authorization**
- Missing Function Level Access Control (CWE-285)
- IDOR (CWE-639) — user-controlled IDs without ownership check
- Path Traversal (CWE-22)

**Input Handling**
- XSS (CWE-79)
- CSRF (CWE-352)
- Open Redirect (CWE-601)
- CORS Misconfiguration (CWE-942) — wildcards, `http://localhost` in allowed origins
- HTTP Parameter Pollution
- Improper Input Validation (CWE-20)

**Resource Management**
- Improper Resource Shutdown (CWE-404)
- Uncontrolled Resource Consumption (CWE-400) — missing rate limiting, unbounded input
- TOCTOU (CWE-367)
- ReDoS — catastrophic backtracking regex

**Error Handling & Information Leakage**
- Improper Error Handling (CWE-209) — stack traces, internal paths, SQL errors leaked
- Information Exposure via Logs (CWE-532) — PII, credentials, tokens
- Debug Features Enabled (CWE-215)

**Deserialization**
- Untrusted Deserialization (CWE-502) — `BinaryFormatter`, `pickle.loads`, `ObjectInputStream`, `YAML.load`

**Supply Chain**
- Vulnerable Third-Party Component (CWE-1395) — covered in Phase 3
- Insecure Direct Use of Library APIs

#### Language-Specific Detection Hints

- **C# / .NET** — `SqlCommand` string concat, `Process.Start(userInput)`, `BinaryFormatter.Deserialize`, `XmlReader` without `DtdProcessing.Prohibit`, `MD5.Create()`/`SHA1.Create()` for passwords, `new Random()` for tokens, embedded `.prv`/`.pem`/`.pfx`, cookies without `HttpOnly`/`Secure`/`SameSite`, `Response.Redirect(userInput)`, missing `[Authorize]`, secrets in `appsettings.json`, sensitive data via `ILogger`.
- **JavaScript / TypeScript** — template literals in `db.query()`, `eval`/`new Function`, `res.redirect(req.query.url)`, `innerHTML = userInput`, `Math.random()` for security, missing `helmet()`/CSP, `require(userInput)`, secrets in committed `.env`.
- **Python / Django** — `cursor.execute(f"... {userInput}")`, `subprocess.call(cmd, shell=True)`, `pickle.loads`/`yaml.load`, `hashlib.md5(password)`, `random.random` for tokens, `app.debug = True` in prod, raw SQL outside ORM without justification, `mark_safe` on user content.
- **Java / Spring** — `stmt.executeQuery("... " + userInput)`, `Runtime.exec(userInput)`, `ObjectInputStream.readObject()`, `MessageDigest.getInstance("MD5")`, missing `@PreAuthorize`/`@Secured`, `DocumentBuilderFactory` without `FEATURE_SECURE_PROCESSING`, `@Autowired` field injection on security-relevant beans.
- **PowerShell / Shell** — `Invoke-Expression $userInput`, plain credentials in `.ps1`, `Start-Process` with user-controlled args.
