# Roo+ merch — GitHub Discussion announcement (2026-11)

Publishing kit for the first merch post. Category: **General**, replies enabled, **post pinned**, **FAQ comment pinned**.

**Campaign identity:** this is the same campaign as the in-product line [`chat:announcement.marketing`](../../webview-ui/src/i18n/locales/en/chat.json:399) ("Stuck on holiday gifts? Roo+ merch: for the agentic developer in your life."), rotated by [`MARKETING_REVISION`](../../src/shared/announcementMarketing.ts:13) = `holiday-merch-v1`. The Discussion, the popup, and the README must point at the same place with the same voice.

| Item               | Value                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Shop               | `https://roo-plus.printify.me/` — already registered as [`EXTERNAL_LINKS.MERCH`](../../webview-ui/src/constants/externalLinks.ts:15) |
| Repo               | `https://github.com/xavier-arosemena/roo-plus`                                                                                       |
| Discussions        | `https://github.com/xavier-arosemena/roo-plus/discussions`                                                                           |
| Products at launch | Insulated mugs, coffee tumblers, vanity plates (growing)                                                                             |
| Fulfilment         | Printify print-on-demand: production 2–7 business days, then transit; all destinations                                               |
| Sign-off           | The standard "About Roo+" paragraph                                                                                                  |
| Register           | Bug-report deadpan (primary), config-note deadpan (alternate)                                                                        |

**Rules honoured in both drafts:** no exclamation marks; profanity-free; never the words _sponsor / donate / support us / fund / buy me a coffee / keep the lights on_; no prices, no competitor names, no implication that the extension is unreliable; self-deprecation only; exactly **one** plain, unjoked sentence about the money.

---

## Post A — primary: bug-report format

> **Title:** `Merch availability — severity: cosmetic`
> **Labels:** `merch`, `severity: cosmetic`, `wontfix`

````markdown
### Summary

A shop exists. It was not planned, it was not requested, and it is now one of the best-documented parts of this project.

### Environment

- Roo+ (any version — this is not version-dependent)
- VS Code, Codium, or any compatible editor
- A browser, or a phone if the browser situation is unresolved
- OS: irrelevant

### Steps to reproduce

1. Open https://roo-plus.printify.me/
2. Look at the items.
3. That is the entire procedure.

### Expected behaviour

The shop does not exist. The project continues to consist of an extension, a mode-catalog, and a changelog, in that order of confidence.

### Actual behaviour

The shop exists. It contains insulated mugs, coffee tumblers, and vanity plates, and it grows whenever I have a free evening.

```
$ merch --status
merch.enabled    = true
requested_by     = nobody
products         = insulated-mug, coffee-tumbler, vanity-plate
blocking_release = false
```

### Frequency

Always. Reproducible on every machine, including the ones that are switched off.

### Priority

P4 — cosmetic. Nothing is broken. This is the first time nothing has been broken and I am as surprised as anyone.

### Additional context

The items carry captions. One reads: _"I didn't fix the bug; it just commented out the broken test and declared victory."_ Another describes a pull request submitted by someone's agent, adding 1,200 unformatted lines with no documentation, labelled _"Fixes typo in README."_ If you have ever reviewed a pull request, you already own this.

Production and shipping are handled by Printify, so I am not the one packing anything. Most orders go into production and ship within 2 to 7 business days, then transit starts; shipping is available to all destinations, which is a sentence I did not have to write myself.

### Steps to fix

Not planned. This is the rare `wontfix` that requires no follow-up.

---

One plain sentence, because the rest of this is a bit: **a portion of every purchase goes back into this repository.** No tiers, no goals, no countdown.

If this feels familiar, the extension will mention the same shop in a small line when the next update lands. That is not a coincidence, it is a campaign, and you are reading its documentation.

If you do not want a mug, the correct action is to close this tab, and simply giving us a star. The report stays open. Nothing happens. That is the design.

> About Roo+. Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.
````

---

## Post B — alternate: config note

> **Title:** `merch: enabled by default`
> **Labels:** `merch`, `docs`

````markdown
```diff
 # default configuration, as of today
+merch.enabled = true
 merch.urgency = none
 merch.todo    = ""
```

### merch.yaml

```yaml
merch:
    enabled: true
    provider: printify # produces, ships, and answers support mail
    products:
        - insulated-mug
        - coffee-tumbler
        - vanity-plate
    growing: true # undocumented, but observable
    shipping: all-destinations
    production: "2-7 business days"
    requested_by: nobody
    approved_by: also nobody
    blocking: false
```

### Notes

- Additive change. No existing behaviour is altered, which is the only kind of guarantee I am qualified to make.
- Nobody needs to update anything. There is nothing to update.
- No migration guide. There is nothing to migrate from, unless you count not owning a mug.
- Documented captions on the items include _"I didn't fix the bug; it just commented out the broken test and declared victory."_ and a 1,200-line agent pull request labelled _"Fixes typo in README."_
- Production and shipping are Printify's job: most orders ship within 2 to 7 business days, then transit begins, and every destination is served.

### Rollback

Not planned.

### Compatibility

Every editor that can open a browser tab. Which is all of them.

---

One plain sentence, because everything above is a bit: **a portion of every purchase goes back into this repository.**

About Roo+. Roo+ is a local-first agentic coding extension for VS Code and Codium and compatible editors. You bring the model; Roo+ runs the loop on your machine, with your approvals, and with no mandatory cloud. Your files and your conversations stay yours.
````

---

## Pinned FAQ comment

> Post immediately after creating the Discussion, then pin it. Same deadpan, but every line here is factual and sourced.

```markdown
FAQ — the boring part, kept in one comment so the post can stay silly.

**What is in the shop?**
Insulated mugs, coffee tumblers, and vanity plates. New items appear occasionally; the shop page is always the current list.

**Who runs it?**
It is a Printify print-on-demand shop. Printify produces each item after it is ordered, ships it, and handles customer support for orders. Roo+ is the seller of record and receives what remains after production and shipping are paid.

**How long does an order take?**
Production: most orders ship within 2 to 7 business days. Transit is on top of that — Printify quotes standard shipping at 2 to 5 business days within the US and 10 to 30 business days internationally, depending on the destination and customs. Checkout is the authority for your address; treat anything in this comment as an estimate, not a promise.

**Where do you ship?**
All destinations, per Printify's Pop-Up Store documentation. If your address can be entered at checkout, it ships there.

**Currency and payment?**
USD, paid through Stripe at checkout. Printify's Pop-Up Store currently sells in USD only.

**Damaged, misprinted, or the wrong item?**
Report it to the support address in your order confirmation email within 30 days of delivery, with the order ID and a photo of the problem. Printify offers a free reprint or a refund for damaged or defective items, and the item does not need to be sent back.

**Returns and exchanges?**
Not supported. Each item is printed once ordered, so size and colour are chosen at checkout and cannot be swapped afterwards. Check the size chart on the listing before ordering.

**Lost in transit, or the address was wrong?**
If a parcel is returned to sender or lost with an invalid address, the product price is refunded.

**Where does the money go?**
A portion of each sale goes to this repository. Amounts are not disclosed, and there are no tiers, goals, or counters.

**Does this change anything about the extension?**
No. Roo+ remains open source under Apache 2.0, and no feature is gated behind a purchase.

**Something went wrong and support has not answered?**
Reply in this thread and just say it is about an order — no need to post order numbers or personal details publicly. I will follow up.
```

---

## README reference

Insert before `## 🤝 Contributing` in [`README.md`](../../README.md:336):

```markdown
## ☕ Merch

Insulated mugs, coffee tumblers, and vanity plates — printed on demand, shipped worldwide, captioned for people who have reviewed an agent's pull request.

**[Browse the shop](https://roo-plus.printify.me/)** · shipping and returns are covered in the [pinned discussion](https://github.com/xavier-arosemena/roo-plus/discussions).

A portion of every purchase goes back into this repository. The extension itself is unchanged by it.
```

---

## Pre-publish checklist

- [ ] Create the Discussion in **General** with replies enabled; pin the post; post and pin the FAQ comment.
- [ ] Verify the Printify order-confirmation support address on a real test order — the FAQ depends on that exact channel, not on a guessed email.
- [ ] Verify checkout actually presents an estimated delivery window; if it does, quote checkout rather than the generic ranges.
- [ ] Do **not** promise holiday delivery. International transit is quoted at 10–30 business days, so late-November orders to distant destinations can land in January. Say "estimate", never "guarantee".
- [ ] Word audit on the final copy: `sponsor`, `donate`, `support us`, `fund`, `help us`, `keep the lights on`, prices, competitor names, exclamation marks — all absent.
- [ ] Keep the products list a superset of what the shop actually shows at publish time.
- [ ] Cross-reference: README section added; in-product line ships with the next release; both use the same `EXTERNAL_LINKS.MERCH` URL.
- [ ] If the in-product marketing copy changes materially, bump [`MARKETING_REVISION`](../../src/shared/announcementMarketing.ts:13) and keep the key defined in **every** locale — the copy is translated, so an English-only edit fails CI.
- [ ] Do not add a per-patch CHANGELOG section for this; changelog entries are handled in release prep.

## Sources for the factual claims

- Production times, 2–7 business days: Printify help, _What are Printify's production times like?_
- Shipping tiers and transit windows: Printify help, _What are Printify's shipping options?_ (standard: US 2–5 business days, international 10–30)
- All destinations, Printify handles customer support, USD-only, merchant of record: Printify help, _What is Printify Pop-Up Store?_
- Damaged/defective reprint or refund within 30 days with photo proof; returns and exchanges unsupported; returned-to-sender or lost with invalid address refunds product price: Printify help, _What is the Printify.me reprint & refund policy?_
