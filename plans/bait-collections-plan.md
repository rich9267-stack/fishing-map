# Bait collections — Designer plan (Oct 27)

Three new collections, each pays 🪙150 + 💎2 once (setup/41 `claim_collection`; every species needs a photographed catch, min 5). Build one at a time: A, then B, then C.

Group keys + names are still to settle with Richard (suggested: `baitsalt` "Saltwater bait", `baitfresh` "Freshwater bait", `baitother` "Shrimp, crabs & other bait"). Each needs: the group key added to `claim_collection` (next `setup/NN` file), SEASON_GROUPS (js/05) + COIN_GROUPS (js/14), species entries (js/05), Learn fish cards (official source or "general advice" label), tank art (js/14), WHATS_NEW, lawyer-packet line.

## A. Saltwater baitfish (10) — design done
Pinfish*, Mullet*, Mojarra*, Scaled sardine (pilchard / greenback / whitebait — one fish, aliases match), Spanish sardine, Threadfin herring, Atlantic menhaden (pogy / bunker), Ballyhoo, Bay anchovy (glass minnow), Atlantic cigar minnow. (*already in the app.) Open: trim to 8 (drop cigar minnow + bay anchovy) so it is reachable?

## B. Freshwater baitfish (8) — proposed
Golden shiner, Threadfin shad, Gizzard shad, Eastern mosquitofish, Fathead minnow, Emerald shiner, Alewife, Creek chub. Works across the whole US, not just Florida. Check for each: Learn card source; some states ban moving live bait fish (wording on the card: "check your state's live-bait rules"). Bluegill & panfish already exist and stay out.

## C. Shrimp, crabs & other bait (7) — proposed
Shrimp (white / pink / brown — one entry), Blue crab, Fiddler crab, Sand flea (mole crab), Hermit crab, Crayfish, Squid.
**Engineer must check first:** can a catch be logged for a non-fish (species picker, Fish ID, weights/length rules, rankings, `seasonFor`)? Shrimp/crabs have no length-weight number; they may need "count only" handling. Crab/shrimp/squid also have their own harvest rules (blue crab licence + trap limits) — Learn cards must carry the official page or stay "general advice" and not state limits we haven't sourced. Never include stone crab or spiny lobster (regulated, not bait).

## Order + questions for Richard
1. Names of the three groups. 2. A at 10 or 8? 3. OK to start with A, then B, then C?
