# KP307 / Network Printer — Hardware Test Matrix

Use this checklist on a real **KP307-UEWB** (or equivalent) before restaurant rollout.
Confirm the raw TCP port with the vendor Setting Tool / User Manual (project default: `DEFAULT_PRINTER_PORT`, typically **9100**).

## Environment

- [ ] Restaurant router powered
- [ ] Android Sales on Wi‑Fi (same LAN as printer)
- [ ] KP307 on Wi‑Fi **or** Ethernet to the same router
- [ ] Optional: Windows Electron POS on same LAN
- [ ] Printer IP reserved in DHCP (recommended)

**Can run without Ethernet cable:** all Wi‑Fi scenarios below if the printer is joined to Wi‑Fi.

---

## A. Network / Wi‑Fi connectivity

| # | Scenario | Expected | Pass |
|---|----------|----------|------|
| A1 | Printer online, correct IP:port | Status Online; Test Print works | |
| A2 | Printer powered off | Status Offline; jobs stay QUEUED | |
| A3 | Printer restarted | Probe recovers to Online; QUEUED drains | |
| A4 | Android restarted | After login, probe + drain backlog | |
| A5 | Router restarted | After reconnect, Online + printing | |
| A6 | Wi‑Fi disconnected on Android | Offline / print fails cleanly | |
| A7 | Wi‑Fi reconnected | Online; QUEUED drains | |
| A8 | Printer IP unchanged after reboot | Still works (DHCP reservation) | |
| A9 | Printer IP changed | Offline until IP updated in Printers settings | |
| A10 | Wrong IP | Offline; Test Print fails with clear error | |
| A11 | Wrong port | Offline / timeout | |
| A12 | Multiple printers (Kitchen + Receipt) | Correct target routing | |
| A13 | Two Android devices | Claim prevents duplicate tickets | |
| A14 | Android + Electron simultaneous | One claim wins; no double print | |

## B. Printing

| # | Scenario | Expected | Pass |
|---|----------|----------|------|
| B1 | Kitchen ticket (KOT) | Prints on KITCHEN target | |
| B2 | Bar ticket | Prints on COUNTER target | |
| B3 | Customer receipt after pay | Prints on RECEIPT target | |
| B4 | Mixed kitchen+bar cart | Current behavior: single KOT (documented) | |
| B5 | Reprint from Print Jobs | New job / reprint lineage; one physical copy | |
| B6 | Multiple consecutive orders | All tickets print in order | |
| B7 | Printer offline during order | Order succeeds; job QUEUED/FAILED, not deleted | |
| B8 | Printer comes online after order | Drain prints QUEUED job once | |
| B9 | Duplicate prevention | Same idempotency key does not create second logical job | |

## C. Status UI

| # | Scenario | Expected | Pass |
|---|----------|----------|------|
| C1 | Online | Green Online after successful TCP probe | |
| C2 | Offline | Red Offline after failed probe | |
| C3 | Checking | Checking while probe in flight | |
| C4 | Unknown | No recent probe / never checked | |
| C5 | Manual Retry / Refresh | Re-probes immediately | |

## D. First-time setup (Android)

| # | Scenario | Expected | Pass |
|---|----------|----------|------|
| D1 | Manual IP + port + save | Config persists after logout/login | |
| D2 | Scan Network finds printer | Optional; empty scan still allows manual IP | |
| D3 | Test Print from settings | Paper prints; status Online | |
| D4 | Staff without Admin | Can view status; cannot edit (403 on save) | |

## E. USB (optional — needs Windows + USB cable)

| # | Scenario | Expected | Pass |
|---|----------|----------|------|
| E1 | print-bridge health | Admin shows bridge Online | |
| E2 | USB Test Print | Spooler RAW prints | |
| E3 | Network agent skips USB jobs | Mobile/Electron do not steal USB jobs | |

## F. Port / hardware confirmation

| # | Check | Result |
|---|-------|--------|
| F1 | Vendor tool shows listen port | ____ (expect 9100) |
| F2 | ESC/POS cut / width OK on 80mm | |
| F3 | Static or reserved IP documented for site | |

---

## Sign-off

- Tester: _______________
- Date: _______________
- Printer model / firmware: _______________
- Android build: _______________
- Notes: _______________
