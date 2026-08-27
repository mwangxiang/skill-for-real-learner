# Rejected alpha.22 desktop evidence

Alpha.22 fixed the full-window footer and introduced the Pilot resize host
candidate, but repeated Electron starts exposed a Host-readiness race: the
first `work-panel/list` call could fail before the Host settled, leaving the
panel on a false empty Work page.

The screenshots in this directory are preserved failure evidence. Alpha.23
adds a second project-discovery request whenever the user opens Work Space.
