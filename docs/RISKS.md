# Risk Register

| Risk | Severity | Current evidence | Mitigation / next proof |
| --- | --- | --- | --- |
| Authoritative APIs require prerelease SDK | High | Exact `auth-server` build exists and local exports are present | Pin exact build; compile and run restart proof |
| Storage survives server restart but redeploy behavior is unknown | High | Local restart passed twice; production service/redeploy not exercised | Test organizer-granted World redeploy |
| No Creator Hub found | Medium | Standard locations checked | CLI path works; install Creator Hub only if mobile/publish workflow requires it |
| Rendered interaction smoke test blocked by browser runtime error | High | Preview server works, browser control failed before tab | Use Creator Hub/Desktop Explorer or repair browser control; do not call runtime ready |
| Real mobile device testing outstanding | High | Mobile docs found, no device exercise | Use `--mobile` QR with supported app early |
| Event cutoff timezone unknown | High | Date found, exact time absent | Ask organizer before final week and submit early |
| Organizer World permission outstanding | High | Organizer offer supplied by user | Request World name and collaborator rights; never purchase |
| Guest identity may reset | Medium | `isGuest`/`userId` API exists, permanence unproven | Allow voting, limit promise, use current identity only |
| Concurrent vote write races | High | SDK orders same-key writes, application transaction still needed | Single authoritative in-memory mutation queue plus durable snapshot |
| Visual Shadow count can hurt mobile performance | High | Not tested | Primitive instancing/cap, test 1/5/10/20/30 on phone |
| Official dependency audit findings | High | npm reports 14 findings including critical transitive `protobufjs`; proposed fix is incompatible SDK downgrade | Seek newer official authoritative build; do not force-fix or override major versions without runtime regression proof |
| World name unknown during local dev | Low | Publishing not yet authorized | Use explicit development placeholder only; replace when organizer grants access |
