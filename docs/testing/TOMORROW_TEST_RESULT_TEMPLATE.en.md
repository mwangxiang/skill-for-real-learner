# Tomorrow's Installation Test Result Template

## 1. Environment

| Field | Record |
|---|---|
| Tester | |
| Start / end time | |
| Windows / architecture | |
| Node / npm / pnpm | |
| Browser / version | |
| Resolution / OS scale / browser zoom | |
| Proxy | None / Yes: |
| DSH version | |
| Package / size / SHA-256 | |
| Isolated DSH_HOME | |
| Isolated learning directory | |

## 2. Result summary

| ID | Gate | Result (pass/fail/blocked/not run) | Evidence |
|---|---|---|---|
| T01 | Tarball identity | | |
| T02 | Fixed-version install | | |
| T03 | Bundle row in dump-config | | |
| T04 | Peer check | | |
| T05 | Host boot and URL | | |
| T06 | Official preview / API-key onboarding | | |
| T07 | Native Simplified Chinese state | | |
| T08 | English switch | | |
| T09 | Reload locale and RPC recovery | | |
| T10 | 1440×900 / 1024×768 / 125% | | |
| T11 | Stop server | | |
| T12 | Exact uninstall | | |
| T13 | Bundle row absent | | |
| T14 | User artifact hash unchanged | | |
| T15 | Official UI restored | | |

## 3. Measured facts

```text
Sentinel SHA-256 before install:
Sentinel SHA-256 after uninstall:
Tarball SHA-256:
Time from command to panel:
Clicks before panel:
```

## 4. Friction notes

### Clearest part


### Most hesitant part


### Technical wording still visible


### Most likely abandonment point for an ordinary learner


### zh-CN / English quality and layout differences


## 5. Defect template

Copy once per issue:

```text
ID:
Severity: P0 / P1 / P2 / P3
Time:
Environment:
Precondition:
Steps:
Expected:
Actual:
Reproducible:
Screenshot:
Log file:
Temporary recovery:
Credential or user-data involvement: no / yes (do not paste sensitive data)
```

## 6. Screenshot inventory

- [ ] `01-installed-zh-CN.png`
- [ ] `02-installed-en.png`
- [ ] `03-reloaded.png`
- [ ] `04-uninstalled-official-ui.png`
- [ ] Failure screenshots, if any

## 7. Final decision

```text
Overall: pass / conditional pass / fail / blocked
P0 count:
P1 count:
P2 count:
P3 count:
May development proceed to the single-focus learning flow: yes / no
Highest-priority fix:
```
