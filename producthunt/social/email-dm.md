# Email and direct messages

Write to people one at a time, and only to people who know you or your work. Never send these
as bulk mail. A personal line at the top matters more than anything below it.

Don't ask anyone to upvote. Product Hunt discounts coordinated votes, and an honest comment
from someone who tried the app helps more. Ask for feedback and let people decide what to do.

Placeholders: `<NAME>`, `<PH_LINK>`, `<PUBLICATION>`. `pnpm producthunt:verify` flags any
other placeholder and any vote request in the blocks below.

## Launch-day note to friends and colleagues

Send after the launch is live (12:01 AM PT), once the maker comment is posted.

```email
Subject: Launchpane is on Product Hunt today

Hi <NAME>,

Today I launched Launchpane on Product Hunt. It's a free, open-source Mac app that shows what starts on your Mac: launch agents, launch daemons and login items, with their status, logs and plists in one place.

<PH_LINK>

If you have a Mac and five minutes, I'd value your honest take, especially anything that's confusing. A comment on the page or a reply to this email both help.

Thanks,
Maxim
```

## Short direct message

For Slack, Teams, Signal, or a DM to someone who already follows the project.

```dm
Hi <NAME>, Launchpane is on Product Hunt today: <PH_LINK>. It's the Mac app for launch agents, daemons and login items I've been working on. If you try it, I'd love to hear what's unclear.
```

## Pitch to a newsletter, blog, or podcast

Send only to publications that cover Mac utilities or developer tools, and say why it fits
their readers. Link the press kit rather than pasting images; the link below works once this
folder is on the `main` branch.

```email
Subject: Launchpane, an open-source Mac app for launch agents and login items

Hi <NAME>,

I read <PUBLICATION> and thought Launchpane might suit your readers who look after their own Macs.

Launchpane shows what starts on a Mac in one window: launch agents, launch daemons and login items that apps bundle. You can see whether each one is loaded, running and enabled, read its logs and plist, and run or edit your own agents. Shared system plists stay read-only, and system daemons need an explicit administrator window.

It's free and MIT-licensed, builds on azu's open-source launchd-ui, and has Developer ID signed and notarized releases for Apple silicon and Intel.

Download: https://github.com/webmaxru/Launchpane/releases/latest
Website: https://salnikov.no/projects/launchpane/
Press kit, screenshots and facts: https://github.com/webmaxru/Launchpane/blob/main/producthunt/press-kit.md

Happy to answer questions or share more detail.

Best,
Maxim Salnikov
```

## Thank-you follow-up

Send the day after to people who tried it, commented, or shared it. Mention what you
changed because of their feedback, if anything.

```email
Subject: Thanks for trying Launchpane

Hi <NAME>,

Thank you for trying Launchpane yesterday and for taking the time to share feedback. I'm tracking it in the open, so you can follow along: https://github.com/webmaxru/Launchpane/issues

If you run into anything else, an issue or a reply here both reach me.

Maxim
```
