# Weight from length — research (Oct 21, 2026)

**Why:** the app guesses a fish's weight from its length (js/07 `WEIGHT_REF`). Today every fish uses one hand-picked
reference point and the same "cube" rule (b = 3). Real fish differ: a pike gets heavier more slowly than a bluegill as it grows.
This page collects published length-to-weight data so the guesses get closer, and adds ~60 fish caught elsewhere in the US
(needed for [plans/us-expansion-plan.md](../plans/us-expansion-plan.md)).

**Formula (same as now, one more number per fish):** weight = ref lb × (length ÷ ref length)^b. Where b is unknown, b = 3 as today.

**Sources (free, public):**
- **FishBase** length–weight table (`poplw`, release 25.04, via the open copy at huggingface.co/datasets/cboettig/fishbase).
  For each fish: total-length studies only (fork-length marked FL), b between 2.5 and 3.6; US studies used when there are 3 or more.
  Value = the middle (median) of all studies at the reference length, so one odd study can't pull it off.
- **Standard weight (Ws) equations**, American Fisheries Society (Neumann, Guy & Willis 2012 and later papers), from the FSA
  package's `WSlit` table (github.com/fishR-Core-Team/FSA). Freshwater fish only. Ws is a *well-fed* fish (75th percentile), so it
  reads ~5–10% heavier than average; used as a cross-check, or × 0.92 when FishBase is thin.
- Scratch scripts that made these numbers are not in the repo; numbers below are rounded.

**Still a guess:** a fat or skinny fish can be 20% off either way, and the app keeps saying "≈ … estimated from length".
Changing these numbers only affects catches logged after the change; saved catches keep their saved weight.

## A. Fish already in the app

**Adopt** = enough studies and within ~35% of today's number. **Keep** = too few studies or the data looked wrong; today's number stays.

| Fish | Ref length | Today | New | b | Studies | Verdict |
|---|---|---|---|---|---|---|
| Snook | 30″ | 8.7 lb | 8.1 lb | 3.03 | 7 | Adopt |
| Crevalle jack | 30″ | 16 | 13.6 | 2.97 | 7 | Adopt |
| Mangrove (gray) snapper | 16″ | 2.4 | 2.0 | 3.08 | 3 US | Adopt |
| Mutton snapper | 24″ | 7.8 | 6.9 | 3.05 | 3 | Adopt |
| Yellowtail snapper | 16″ | 1.7 | 1.3 | 2.76 | 4 | Adopt |
| Lane snapper | 12″ | 1.0 | 0.83 | 2.96 | 8 | Adopt |
| Red snapper | 24″ | 8 | 7.2 | 3.16 | 3 US | Adopt |
| Whiting (southern kingfish) | 14″ | 0.95 | 1.2 | 3.26 | 3 US | Adopt |
| Spanish mackerel | 20″ FL | 2.2 | 2.4 | 3.00 | 3 FL | Adopt |
| Black grouper | 36″ | 25 | 24 | 3.09 | 5 | Adopt |
| Gag | 30″ | 12 | 12.7 | 2.96 | 4 | Adopt |
| Hogfish | 20″ FL | 5.5 | 5.6 | 2.95 | 5 FL | Adopt |
| Barracuda | 40″ | 14.5 | 14.5 | 2.88 | 6 | Adopt |
| Cobia | 40″ | 19 | 15.9 | 3.09 | 5 | Adopt |
| Ladyfish | 20″ | 1.5 | 1.24 | 2.56 | 4 | Adopt |
| Black drum | 30″ | 15 | 11.7 | 2.93 | 4 | Adopt |
| Largemouth bass | 20″ | 5 | 4.4 | 3.16 | 45 US | Adopt (Ws 4.7) |
| Snakehead | 30″ | 10 | 8.6 | 3.07 | 5 | Adopt (Ws 9.3) |
| Bluegill / panfish | 8″ | 0.5 | 0.38 | 3.11 | 35 US | Adopt (Ws 0.42) |
| Mullet | 16″ | 1.6 | 1.5 | 2.90 | 57 | Adopt |
| Southern flounder | 16″ | 1.8 | 1.9 | 3.30 | 3 US | Adopt |
| Amberjack | 36″ | 22 | 20.4 | 2.84 | 6 | Adopt |
| Spadefish | 14″ | 2.4 | 3.2 | 2.95 | 12 | Adopt |
| Blue runner | 14″ | 1.3 | 1.2 | 3.01 | 6 | Adopt |
| Crappie (black) | 11″ | 0.8 | 0.70 | 3.07 | 17 US | Adopt (Ws 0.81) |
| Channel catfish | 20″ | 3.2 | 2.7 | 3.28 | 14 US | Adopt (Ws 2.9) |
| Tilapia | 12″ | 1.6 | 1.24 | 3.06 | 4 | Adopt (Ws 1.22) |
| Blue catfish | 30″ | 13 | 11.5 | 3.41 | 3 | Adopt (Ws 11.9) |
| Flathead catfish | 30″ | 12.5 | 11.7 | 3.21 | 8 US | Adopt (Ws 12.9) |
| Black bullhead | 12″ | 0.8 | 0.88 | 3.02 | 10 US | Adopt |
| Brown bullhead | 12″ | 0.85 | 0.79 | 3.07 | 4 | Adopt |
| Yellow bullhead | 11″ | 0.65 | 0.67 | 2.92 | 4 US | Adopt |
| Walking catfish | 12″ | 0.6 | 0.46 | 2.70 | 3 | Adopt |
| Brown hoplo | 8″ | 0.3 | 0.34 | 3.02 | 6 | Adopt |
| Blacktip shark | 60″ | 60 | 49 | 2.91 | 8 | Adopt |
| Horse-eye jack | 24″ | 6.5 | 5.1 | 2.86 | 3 | Adopt |
| Lionfish | 12″ | 0.8 | 0.63 | 3.26 | 10 | Adopt |
| Skipjack | 24″ | 8 | 9.6 | 3.02 | 5 | Adopt |
| Wahoo | 60″ | 48 | 65 | 3.19 | 4 US | **Keep** (data 36% heavier — check with Richard's catches) |
| Yellowfin tuna | 40″ | 40 | 30 | 2.85 | 5 | **Keep** (likely fork vs total length mix-up) |
| Bull shark | 72″ | 110 | 86 | 2.87 | 4 | **Keep** (both look light; real 6-ft bulls run heavier) |
| Bluefish | 20″ | 2.7 | 3.7 | 2.81 | 3 US | **Keep** (37% heavier than known catches) |
| Dolphin (mahi) | 40″ | 19.6 | 8.4 | — | 3 | **Keep** (data clearly wrong) |
| Sailfin catfish | 16″ | 1.5 | 9.4 | — | 2 | **Keep** (data clearly wrong) |
| Blackfin tuna | 28″ FL | 12 | 16.8 | 3.03 | 5 FL | **Keep** (fork length; check) |
| Redfish (red drum) | 27″ | 7.5 | 7.6 | 3.03 | 1 + Louisiana study (Jenkins) | Adopt (two sources agree) |
| Tarpon, seatrout, pompano, permit, king mackerel, red grouper, goliath, peacock bass, Mayan cichlid, tripletail, little tunny, pinfish, hardhead, Florida gar, oscar, white catfish, gafftopsail, bonefish, bonnethead, nurse shark, lemon shark, cubera, bar jack, sand seatrout | | | | | 0–2 | **Keep** (too few studies) |

## B. New fish for the rest of the US (none in the app yet)

**Good** = 3+ studies or a Ws equation that agrees. **Rough** = 1–2 studies; fine for "≈", re-check later.

| Fish | Ref length | Weight | b | Quality |
|---|---|---|---|---|
| Smallmouth bass | 16″ | 2.0 lb | 3.02 | Good (19 US, Ws 2.3) |
| Spotted bass | 14″ | 1.2 | 3.06 | Good |
| Striped bass | 28″ | 9.7 | 3.14 | Good (Ws 9.9) |
| White bass | 12″ | 0.8 | 3.08 | Good (Ws) |
| White perch | 9″ | 0.37 | 3.14 | Good (Ws) |
| Walleye | 18″ | 2.1 | 3.17 | Good (Ws 2.2) |
| Sauger | 14″ | 0.9 | 3.19 | Good (Ws) |
| Yellow perch | 9″ | 0.34 | 3.08 | Good (Ws 0.38) |
| Northern pike | 26″ | 4.0 | 3.06 | Good (41 US) |
| Muskellunge | 40″ | 18 | 3.40 | Good (Ws 18.9) |
| Chain pickerel | 18″ | 1.25 | 3.10 | Good (Ws 1.4) |
| Rainbow trout / steelhead | 14″ | 1.1 | 3.00 | Good (Ws 1.08) |
| Brown trout | 14″ | 1.0 | 3.05 | Good |
| Brook trout | 10″ | 0.43 | 3.10 | Good |
| Lake trout | 26″ | 5.6 | 3.14 | Good |
| Cutthroat trout | 14″ | 1.0 | 3.00 | Rough (sources disagree 0.75–1.15) |
| Chinook (king) salmon | 32″ | 13.5 | 3.00 | Rough |
| Coho (silver) salmon | 26″ | 7.1 | 3.00 | Rough |
| Sockeye salmon | 24″ | 6 | 3.00 | Rough |
| White crappie | 11″ | 0.66 | 3.12 | Good |
| Redear sunfish | 9″ | 0.51 | 3.10 | Good |
| Pumpkinseed | 7″ | 0.25 | 3.24 | Good |
| Rock bass | 8″ | 0.36 | 3.12 | Good |
| Warmouth | 7″ | 0.27 | 3.20 | Good (Ws; FishBase looked wrong) |
| Common carp | 24″ | 6.3 | 2.79 | Good |
| Freshwater drum | 16″ | 1.75 | 3.04 | Good (Ws) |
| Burbot | 20″ | 1.9 | 2.95 | Good |
| Bowfin | 22″ | 5.5 | 3.00 | Rough |
| Longnose gar | 36″ | 5.1 | 3.36 | Good (Ws) |
| Spotted gar | 24″ | 1.9 | 3.40 | Good |
| Alligator gar | 60″ | 75 | 3.00 | Rough |
| White sturgeon | 60″ | 95 | 3.00 | Rough |
| American shad | 20″ | 2.6 | 3.09 | Rough |
| Summer flounder (fluke) | 20″ | 3.0 | 3.23 | Good (9 US) |
| Gulf flounder | 14″ | 1.1 | 3.00 | Rough |
| Weakfish | 18″ | 2.0 | 2.98 | Good |
| Tautog | 16″ | 3.4 | 2.96 | Good |
| Black sea bass | 14″ | 1.4 | 2.97 | Good |
| Scup (porgy) | 10″ | 0.82 | 3.14 | Good |
| Atlantic croaker | 10″ | 0.43 | 3.13 | Good |
| Spot | 8″ | 0.26 | 3.07 | Good |
| Atlantic cod | 26″ | 6.3 | 3.06 | Good |
| Haddock | 20″ | 2.8 | 3.17 | Good |
| Pollock | 24″ | 4.4 | 3.08 | Good |
| Bluefin tuna | 80″ | 290 | 2.93 | Rough |
| Albacore | 36″ FL | 27.6 | 2.80 | Good (14 FL) |
| Pacific halibut | 40″ | 27 | 3.18 | Rough |
| California halibut | 26″ | 6.8 | 3.08 | Rough |
| Lingcod | 28″ | 10.5 | 3.00 | Rough |
| Calico (kelp) bass | 14″ | 0.7 | 3.27 | Rough |
| California yellowtail | 32″ | 8.4 | 2.58 | Rough (looks light) |
| White seabass | 36″ | 16 | 2.94 | Rough |

## C. Name clashes to sort out before adding section B

The app finds a fish by words in its name, so some US names would grab the wrong fish:
- "trout" today means **spotted seatrout**; most of the US means **rainbow trout**. "White trout" = sand seatrout.
- "yellowtail" = yellowtail **snapper** in Florida, a **jack** in California.
- "speckled perch" = crappie (Florida) vs. "perch" = yellow/white perch.
- "flounder", "drum" (red / black / freshwater), "bass" (largemouth / striped / sea bass), "salmon", "halibut": need the full name or the place.
- Fix: match the most specific name first (the app already does), and later use the state the spot is in to break ties.

## D. Built (v154, Oct 21 2026)
- js/07 `WEIGHT_REF` rows have the 4th number b and the "Adopt" numbers; "Keep" rows unchanged. They stay the fish rank rows (same order as js/15 and the database table `fish_rank_species`, which got a `ref_b` column in setup/93).
- `WEIGHT_MORE`: section B fish (except longnose / spotted gar and white crappie, already covered by the Florida gar and crappie rows) plus Florida fish that had no guess: gulf toadfish, grunts, porkfish (rough), porgy, gray triggerfish, clown knifefish, checkered puffer, mojarra, silver jenny.
- Weight guesses use the longest matching name across both lists (`weightRow`), so "Lake trout" no longer gets the seatrout guess and "Bar jack" / "Skipjack tuna" / "Sand seatrout" get their own rows. "=spot" matches only the exact name "Spot". Fish rank keeps the database's old row choice (`weightRef`).
- setup/93 re-estimated every catch whose weight was estimated (≈), and gave an estimate to catches with a length but no weight; weighed fish untouched.
- Section C clash "yellowtail" (California) still needs the state (US plan step 1); plain "Yellowtail" stays the snapper.
