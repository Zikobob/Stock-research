# Try to break it: a checklist for judges and teammates

The sample trip is tidy on purpose. These checks use the app the way a real person (or a grumpy judge) would, so you can see that nothing is hard-wired. Each line says what *should* happen.

## Start from nothing
- [ ] **Create a new account** (Sign Up) with your own name. You land in a short survey, then an empty Home that says *Plan your first group trip*. There is no sample data.
- [ ] With the demo account: *Settings → Clear the sample trips*. The app is empty again. *Reset app data* brings the sample trips back.
- [ ] **Create a trip** from scratch (any city, dates, budget). Add an activity, a poll, an expense, a task, a flight.

## Type the wrong thing
- [ ] Sign up with `abc`, then `a@b`, then a 5-letter password: each gets a plain message under the field.
- [ ] Add an expense of `-5`, `abc`, `0`, `1000001`: refused with a clear message. `12.5` and `1,200` work.
- [ ] Join a trip with `ZZZ-9999`, `abc`, an empty code: refused. Join a trip you are already in: refused.
- [ ] Add a flight with an unknown airport (`XXX`), identical from/to airports, or arrival before departure: refused.
- [ ] Add an activity that overlaps another: you get a warning.
- [ ] Type a name with an accent or apostrophe (`Zoë`, `O’Brien`): accepted.

## Break the connection
- [ ] Turn on **airplane mode**. Plan, vote, add expenses, open documents and the offline map, ask Scout. Weather and rates show saved data and say so.
- [ ] With sync on (see below) make a change offline, then turn the connection back on: it reaches the other phone. The badge says *Offline · N waiting* and then *Live*.

## Two phones
- [ ] Start the server (`npm run server`). Phone A: *Crew & roles → Share this trip across phones*. Phone B: *Join a trip*, type the code. Both show **Live · 2 phones**.
- [ ] Send a chat message, cast a vote, add an expense, add a photo, a receipt, a PDF on one phone: each shows up on the other.
- [ ] Your **Scout AI** chat and other people's emails do not appear on the other phone.

## Accessibility and comfort
- [ ] *Settings → Text size → Extra large*: nothing is cut off or sideways-scrolling.
- [ ] Turn on the phone's **Reduce Motion**: the 360° view stops auto-rotating, entrances do not animate, Settings explains why.
- [ ] Switch language to 日本語, then back.
- [ ] Use a screen reader (VoiceOver / TalkBack): every button has a label.

## Look under the bonnet
- [ ] `npm test` and `npm run e2e` (see `e2e/README.md`): unit and browser tests pass.
- [ ] *More → How it works*: architecture, sync, security, validation, rubric map.
- [ ] `docs/RATING_SHEET.md`: every line of the rating sheet and where it is shown, including the weak spots.
