//kukifejasdasdasd
const buyInScreen = document.getElementById("buyInScreen");
const gameScreen = document.getElementById("gameScreen");
const buyInInput = document.getElementById("buyInInput");
const startGameBtn = document.getElementById("startGameBtn");
const buyInError = document.getElementById("buyInError");

const totalBuyInText = document.getElementById("totalBuyInText");
const balanceText = document.getElementById("balanceText");
const profitText = document.getElementById("profitText");
const currentBetText = document.getElementById("currentBetText");
const lastWinText = document.getElementById("lastWinText");
const roundWinText = document.getElementById("roundWinText");

const dealerCardsEl = document.getElementById("dealerCards");
const dealerValueEl = document.getElementById("dealerValue");
const messageText = document.getElementById("messageText");
const sideBetResultText = document.getElementById("sideBetResultText");
const handsArea = document.getElementById("handsArea");

const clearBetsBtn = document.getElementById("clearBetsBtn");
const rebetBtn = document.getElementById("rebetBtn");
const dealBtn = document.getElementById("dealBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const doubleBtn = document.getElementById("doubleBtn");
const splitBtn = document.getElementById("splitBtn");
const newBuyInBtn = document.getElementById("newBuyInBtn");

const rulesBtn = document.getElementById("rulesBtn");
const rulesModal = document.getElementById("rulesModal");
const closeRulesBtn = document.getElementById("closeRulesBtn");

const chipButtons = document.querySelectorAll(".chip");

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

let totalBuyIn = 0;
let balance = 0;
let selectedChip = 100;

let deck = [];
let dealerHand = [];
let dealerHoleHidden = true;

let roundStarted = false;
let roundFinished = false;
let activeHandIndex = 0;

let hands = [];
let lastBets = null;
let lastRoundNet = 0;
let currentRoundWin = 0;
let roundStartBalance = 0;
let autoClearTimer = null;

function createEmptyHand(index) {
  return {
    index,
    cards: [],
    result: "",
    finished: false,
    busted: false,
    blackjack: false,
    stood: false,
    doubled: false,
    splitHand: false,
    aceSplitLocked: false,
    sideResults: {
      perfectPairs: null,
      twentyOneThree: null
    },
    bets: {
      main: 0,
      perfectPairs: 0,
      twentyOneThree: 0
    }
  };
}

function createHands() {
  hands = [
    createEmptyHand(0),
    createEmptyHand(1),
    createEmptyHand(2)
  ];
}

function refreshHandIndexes() {
  hands.forEach((hand, index) => {
    hand.index = index;
  });
}

function cloneBetsFromHands() {
  return hands.map((hand) => ({
    main: hand.bets.main,
    perfectPairs: hand.bets.perfectPairs,
    twentyOneThree: hand.bets.twentyOneThree
  }));
}

function formatNumber(number) {
  return Number(number).toLocaleString("hu-HU");
}

function formatSigned(number) {
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${formatNumber(number)}`;
}

function getHandTotalBet(hand) {
  return hand.bets.main + hand.bets.perfectPairs + hand.bets.twentyOneThree;
}

function getTotalBet() {
  return hands.reduce((total, hand) => total + getHandTotalBet(hand), 0);
}

function getTotalBetFromBetList(betList) {
  if (!betList) {
    return 0;
  }

  return betList.reduce((total, bet) => {
    return total + bet.main + bet.perfectPairs + bet.twentyOneThree;
  }, 0);
}

function getActiveHands() {
  return hands.filter((hand) => hand.bets.main > 0);
}

function updateMoneyDisplay() {
  const profit = balance - totalBuyIn;

  totalBuyInText.textContent = formatNumber(totalBuyIn);
  balanceText.textContent = formatNumber(balance);
  profitText.textContent = formatSigned(profit);
  currentBetText.textContent = formatNumber(getTotalBet());
  lastWinText.textContent = formatSigned(lastRoundNet);
  roundWinText.textContent = formatNumber(currentRoundWin);
}

function saveState() {
  localStorage.setItem("blackjackTotalBuyIn", String(totalBuyIn));
  localStorage.setItem("blackjackBalance", String(balance));
  localStorage.setItem("blackjackLastRoundNet", String(lastRoundNet));
  localStorage.setItem("blackjackCurrentRoundWin", String(currentRoundWin));

  if (lastBets) {
    localStorage.setItem("blackjackLastBets", JSON.stringify(lastBets));
  }
}

function loadState() {
  const savedTotalBuyIn = Number(localStorage.getItem("blackjackTotalBuyIn"));
  const savedBalance = Number(localStorage.getItem("blackjackBalance"));
  const savedLastRoundNet = Number(localStorage.getItem("blackjackLastRoundNet"));
  const savedCurrentRoundWin = Number(localStorage.getItem("blackjackCurrentRoundWin"));
  const savedLastBets = localStorage.getItem("blackjackLastBets");

  if (savedLastBets) {
    try {
      const parsed = JSON.parse(savedLastBets);

      if (Array.isArray(parsed)) {
        lastBets = parsed;
      }
    } catch (error) {
      lastBets = null;
    }
  }

  if (Number.isFinite(savedLastRoundNet)) {
    lastRoundNet = savedLastRoundNet;
  }

  if (Number.isFinite(savedCurrentRoundWin)) {
    currentRoundWin = savedCurrentRoundWin;
  }

  if (savedTotalBuyIn > 0 && savedBalance >= 0) {
    totalBuyIn = savedTotalBuyIn;
    balance = savedBalance;

    buyInScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    createHands();
    resetTableForNewRound(false);
    updateMoneyDisplay();
  }
}

function createDeck() {
  const newDeck = [];

  for (let pack = 0; pack < 6; pack += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        newDeck.push({
          rank,
          suit,
          id: `${rank}${suit}${pack}`
        });
      }
    }
  }

  return shuffle(newDeck);
}

function shuffle(cards) {
  const shuffled = [...cards];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[randomIndex];
    shuffled[randomIndex] = temp;
  }

  return shuffled;
}

function drawCard() {
  if (deck.length < 40) {
    deck = createDeck();
  }

  return deck.pop();
}

function getCardValue(card) {
  if (card.rank === "A") {
    return 11;
  }

  if (["J", "Q", "K"].includes(card.rank)) {
    return 10;
  }

  return Number(card.rank);
}

function getHandValue(cards) {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    value += getCardValue(card);

    if (card.rank === "A") {
      aces += 1;
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }

  return value;
}

function isBlackjack(cards) {
  return cards.length === 2 && getHandValue(cards) === 21;
}

function isRedSuit(suit) {
  return suit === "♥" || suit === "♦";
}

function canSplitCurrentHand() {
  const hand = hands[activeHandIndex];

  if (!roundStarted || roundFinished || !hand || hand.finished) {
    return false;
  }

  if (hand.cards.length !== 2) {
    return false;
  }

  if (hand.cards[0].rank !== hand.cards[1].rank) {
    return false;
  }

  if (balance < hand.bets.main) {
    return false;
  }

  return hand.bets.main > 0;
}

function renderCard(card, hidden = false) {
  const cardEl = document.createElement("div");

  if (hidden) {
    cardEl.className = "card back";
    return cardEl;
  }

  cardEl.className = `card ${isRedSuit(card.suit) ? "red" : ""}`;

  const cornerEl = document.createElement("div");
  cornerEl.className = "corner";
  cornerEl.innerHTML = `${card.rank}<br>${card.suit}`;

  const suitEl = document.createElement("div");
  suitEl.className = "center-suit";
  suitEl.textContent = card.suit;

  cardEl.appendChild(cornerEl);
  cardEl.appendChild(suitEl);

  return cardEl;
}

function renderDealer() {
  dealerCardsEl.innerHTML = "";

  dealerHand.forEach((card, index) => {
    const hidden = index === 1 && dealerHoleHidden;
    dealerCardsEl.appendChild(renderCard(card, hidden));
  });

  const visibleDealerCards = dealerHoleHidden ? [dealerHand[0]].filter(Boolean) : dealerHand;
  dealerValueEl.textContent = `Value: ${visibleDealerCards.length ? getHandValue(visibleDealerCards) : 0}`;
}

function renderHands() {
  handsArea.innerHTML = "";

  hands.forEach((hand) => {
    const handEl = document.createElement("div");
    handEl.className = "hand-seat";

    if (roundStarted && hand.index === activeHandIndex && !hand.finished) {
      handEl.classList.add("active-hand");
    }

    const title = document.createElement("h3");
    title.className = "hand-title";
    title.textContent = `Hand ${hand.index + 1}`;

    const result = document.createElement("div");
    result.className = "hand-result";
    result.textContent = hand.result;

    const value = document.createElement("div");
    value.className = "player-value";
    value.textContent = `Value: ${hand.cards.length ? getHandValue(hand.cards) : 0}`;

    const cards = document.createElement("div");
    cards.className = "cards";

    hand.cards.forEach((card) => {
      cards.appendChild(renderCard(card));
    });

    const betting = document.createElement("div");
    betting.className = "betting-area";

    const perfectPairs = createBetCircle(hand, "perfectPairs", "Perfect Pairs", hand.bets.perfectPairs, false);
    const main = createBetCircle(hand, "main", "Main Bet", hand.bets.main, true);
    const twentyOneThree = createBetCircle(hand, "twentyOneThree", "21 + 3", hand.bets.twentyOneThree, false);

    betting.appendChild(perfectPairs);
    betting.appendChild(main);
    betting.appendChild(twentyOneThree);

    handEl.appendChild(title);
    handEl.appendChild(result);
    handEl.appendChild(value);
    handEl.appendChild(cards);
    handEl.appendChild(betting);

    handsArea.appendChild(handEl);
  });
}

function createBetCircle(hand, target, label, amount, isMain) {
  const button = document.createElement("button");
  button.className = isMain ? "bet-circle main-bet" : "bet-circle side-bet";
  button.dataset.handIndex = String(hand.index);
  button.dataset.betTarget = target;

  if (!isMain && hand.sideResults && hand.sideResults[target]) {
    button.classList.add(`side-${hand.sideResults[target]}`);
  }

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  const amountEl = document.createElement("strong");
  amountEl.textContent = formatNumber(amount);

  button.appendChild(labelEl);
  button.appendChild(amountEl);

  button.addEventListener("click", () => {
    addBet(hand.index, target);
  });

  return button;
}

function renderAll() {
  renderDealer();
  renderHands();
  updateMoneyDisplay();
  setActionButtons();
}

function setActionButtons() {
  const totalBet = getTotalBet();
  const activeHands = getActiveHands();
  const currentHand = hands[activeHandIndex];
  const lastBetTotal = getTotalBetFromBetList(lastBets);

  const canDeal = !roundStarted && !roundFinished && totalBet > 0 && activeHands.length > 0 && totalBet <= balance;
  const canPlay = roundStarted && !roundFinished && currentHand && currentHand.bets.main > 0 && !currentHand.finished && !currentHand.aceSplitLocked;
  const canRebet = !roundStarted && !roundFinished && lastBets && lastBetTotal > 0 && lastBetTotal <= balance;

  clearBetsBtn.disabled = roundStarted || roundFinished || totalBet === 0;
  rebetBtn.disabled = !canRebet;
  dealBtn.disabled = !canDeal;

  hitBtn.disabled = !canPlay;
  standBtn.disabled = !canPlay;

  const canDouble = canPlay && currentHand.cards.length === 2 && balance >= currentHand.bets.main;
  doubleBtn.disabled = !canDouble;

  splitBtn.disabled = !canSplitCurrentHand();
}

function clearAutoTimer() {
  if (autoClearTimer) {
    clearTimeout(autoClearTimer);
    autoClearTimer = null;
  }
}

function scheduleAutoClear() {
  clearAutoTimer();

  autoClearTimer = setTimeout(() => {
    prepareNextRound();
  }, 5000);
}

function resetBets() {
  hands.forEach((hand) => {
    hand.bets.main = 0;
    hand.bets.perfectPairs = 0;
    hand.bets.twentyOneThree = 0;
    hand.sideResults.perfectPairs = null;
    hand.sideResults.twentyOneThree = null;
  });

  messageText.textContent = "Place your bets.";
  sideBetResultText.textContent = "";
  renderAll();
}

function resetTableForNewRound(resetBetsToo) {
  dealerHand = [];
  dealerHoleHidden = true;
  roundStarted = false;
  roundFinished = false;
  activeHandIndex = 0;

  if (resetBetsToo) {
    createHands();
  }

  hands.forEach((hand) => {
    hand.cards = [];
    hand.result = "";
    hand.finished = false;
    hand.busted = false;
    hand.blackjack = false;
    hand.stood = false;
    hand.doubled = false;
    hand.splitHand = false;
    hand.aceSplitLocked = false;
    hand.sideResults.perfectPairs = null;
    hand.sideResults.twentyOneThree = null;

    if (resetBetsToo) {
      hand.bets.main = 0;
      hand.bets.perfectPairs = 0;
      hand.bets.twentyOneThree = 0;
    }
  });

  refreshHandIndexes();

  messageText.textContent = "Place your bets.";
  sideBetResultText.textContent = "";

  renderAll();
}

function prepareNextRound() {
  clearAutoTimer();
  currentRoundWin = 0;
  resetTableForNewRound(true);
}

function startGame() {
  const amount = Number(buyInInput.value);

  if (!Number.isInteger(amount) || amount < 1000) {
    buyInError.textContent = "Minimum buy-in: 1 000";
    return;
  }

  clearAutoTimer();

  totalBuyIn = amount;
  balance = amount;
  lastRoundNet = 0;
  currentRoundWin = 0;
  lastBets = null;
  deck = createDeck();
  createHands();

  saveState();

  buyInError.textContent = "";
  buyInScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  resetTableForNewRound(true);
}

function addBet(handIndex, target) {
  if (roundStarted || roundFinished) {
    return;
  }

  const hand = hands[handIndex];

  if (!hand) {
    return;
  }

  if (target !== "main" && hand.bets.main <= 0) {
    messageText.textContent = "Place Main Bet first on this hand.";
    return;
  }

  const newTotalBet = getTotalBet() + selectedChip;

  if (newTotalBet > balance) {
    messageText.textContent = "Not enough balance.";
    return;
  }

  hand.bets[target] += selectedChip;
  messageText.textContent = "Place your bets.";

  renderAll();
}

function applyRebet() {
  if (roundStarted || roundFinished || !lastBets) {
    return;
  }

  const lastBetTotal = getTotalBetFromBetList(lastBets);

  if (lastBetTotal <= 0) {
    messageText.textContent = "No previous bet.";
    return;
  }

  if (lastBetTotal > balance) {
    messageText.textContent = "Not enough balance for rebet.";
    return;
  }

  createHands();

  hands.forEach((hand, index) => {
    const savedBet = lastBets[index];

    hand.bets.main = savedBet ? savedBet.main : 0;
    hand.bets.perfectPairs = savedBet ? savedBet.perfectPairs : 0;
    hand.bets.twentyOneThree = savedBet ? savedBet.twentyOneThree : 0;
  });

  messageText.textContent = "Previous bet placed.";
  sideBetResultText.textContent = "";

  renderAll();
}

function rankToPokerValue(rank) {
  if (rank === "A") {
    return 14;
  }

  if (rank === "K") {
    return 13;
  }

  if (rank === "Q") {
    return 12;
  }

  if (rank === "J") {
    return 11;
  }

  return Number(rank);
}

function isStraight(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const unique = [...new Set(sorted)];

  if (unique.length !== 3) {
    return false;
  }

  const normalStraight = unique[0] + 1 === unique[1] && unique[1] + 1 === unique[2];
  const aceLowStraight = unique[0] === 2 && unique[1] === 3 && unique[2] === 14;

  return normalStraight || aceLowStraight;
}

function evaluatePerfectPairs(hand) {
  if (hand.bets.perfectPairs <= 0) {
    return {
      payout: 0
    };
  }

  const first = hand.cards[0];
  const second = hand.cards[1];

  if (!first || !second || first.rank !== second.rank) {
    return {
      payout: 0
    };
  }

  if (first.rank === second.rank && first.suit === second.suit) {
    return {
      payout: hand.bets.perfectPairs * 26
    };
  }

  if (isRedSuit(first.suit) === isRedSuit(second.suit)) {
    return {
      payout: hand.bets.perfectPairs * 11
    };
  }

  return {
    payout: hand.bets.perfectPairs * 6
  };
}

function evaluateTwentyOneThree(hand) {
  if (hand.bets.twentyOneThree <= 0) {
    return {
      payout: 0
    };
  }

  const cards = [hand.cards[0], hand.cards[1], dealerHand[0]];

  if (cards.some((card) => !card)) {
    return {
      payout: 0
    };
  }

  const sameSuit = cards.every((card) => card.suit === cards[0].suit);
  const sameRank = cards.every((card) => card.rank === cards[0].rank);
  const values = cards.map((card) => rankToPokerValue(card.rank));
  const straight = isStraight(values);

  if (sameRank && sameSuit) {
    return {
      payout: hand.bets.twentyOneThree * 101
    };
  }

  if (straight && sameSuit) {
    return {
      payout: hand.bets.twentyOneThree * 41
    };
  }

  if (sameRank) {
    return {
      payout: hand.bets.twentyOneThree * 31
    };
  }

  if (straight) {
    return {
      payout: hand.bets.twentyOneThree * 11
    };
  }

  if (sameSuit) {
    return {
      payout: hand.bets.twentyOneThree * 6
    };
  }

  return {
    payout: 0
  };
}

function settleSideBets() {
  let totalPayout = 0;

  getActiveHands().forEach((hand) => {
    const perfectPairsResult = evaluatePerfectPairs(hand);
    const twentyOneThreeResult = evaluateTwentyOneThree(hand);

    totalPayout += perfectPairsResult.payout;
    totalPayout += twentyOneThreeResult.payout;

    if (hand.bets.perfectPairs > 0) {
      hand.sideResults.perfectPairs = perfectPairsResult.payout > 0 ? "win" : "lose";
    }

    if (hand.bets.twentyOneThree > 0) {
      hand.sideResults.twentyOneThree = twentyOneThreeResult.payout > 0 ? "win" : "lose";
    }
  });

  balance += totalPayout;
  sideBetResultText.textContent = "";
}

function deal() {
  const totalBet = getTotalBet();
  const activeHands = getActiveHands();

  if (activeHands.length === 0) {
    messageText.textContent = "Place at least one Main Bet.";
    return;
  }

  if (totalBet > balance) {
    messageText.textContent = "Not enough balance.";
    return;
  }

  clearAutoTimer();

  currentRoundWin = 0;
  lastBets = cloneBetsFromHands();
  roundStartBalance = balance;
  balance -= totalBet;

  roundStarted = true;
  roundFinished = false;
  dealerHoleHidden = true;
  dealerHand = [drawCard(), drawCard()];

  hands.forEach((hand) => {
    hand.cards = [];
    hand.result = "";
    hand.finished = false;
    hand.busted = false;
    hand.blackjack = false;
    hand.stood = false;
    hand.doubled = false;
    hand.splitHand = false;
    hand.aceSplitLocked = false;
    hand.sideResults.perfectPairs = null;
    hand.sideResults.twentyOneThree = null;

    if (hand.bets.main > 0) {
      hand.cards = [drawCard(), drawCard()];
      hand.blackjack = isBlackjack(hand.cards);

      if (hand.blackjack) {
        hand.finished = true;
        hand.result = "Blackjack";
      }
    }
  });

  settleSideBets();

  const dealerHasBlackjack = isBlackjack(dealerHand);

  if (dealerHasBlackjack) {
    finishRound();
    return;
  }

  const firstPlayableHand = hands.find((hand) => hand.bets.main > 0 && !hand.finished);

  if (firstPlayableHand) {
    activeHandIndex = firstPlayableHand.index;
    messageText.textContent = `Playing Hand ${activeHandIndex + 1}.`;
  } else {
    finishRound();
    return;
  }

  renderAll();
  saveState();
}

function hit() {
  if (!roundStarted || roundFinished) {
    return;
  }

  const hand = hands[activeHandIndex];

  if (!hand || hand.finished || hand.aceSplitLocked) {
    return;
  }

  hand.cards.push(drawCard());

  const value = getHandValue(hand.cards);

  if (value > 21) {
    hand.busted = true;
    hand.finished = true;
    hand.result = "Bust";
    moveToNextHand();
  }

  renderAll();
}

function stand() {
  if (!roundStarted || roundFinished) {
    return;
  }

  const hand = hands[activeHandIndex];

  if (!hand || hand.finished || hand.aceSplitLocked) {
    return;
  }

  hand.stood = true;
  hand.finished = true;
  hand.result = "Stand";

  moveToNextHand();
  renderAll();
}

function doubleDown() {
  if (!roundStarted || roundFinished) {
    return;
  }

  const hand = hands[activeHandIndex];

  if (!hand || hand.finished || hand.aceSplitLocked || hand.cards.length !== 2) {
    return;
  }

  if (balance < hand.bets.main) {
    messageText.textContent = "Not enough balance to double.";
    return;
  }

  balance -= hand.bets.main;
  hand.bets.main *= 2;
  hand.doubled = true;

  hand.cards.push(drawCard());

  const value = getHandValue(hand.cards);

  if (value > 21) {
    hand.busted = true;
    hand.result = "Double bust";
  } else {
    hand.result = "Double";
  }

  hand.finished = true;

  moveToNextHand();
  renderAll();
}

function splitHand() {
  if (!canSplitCurrentHand()) {
    return;
  }

  const hand = hands[activeHandIndex];
  const firstCard = hand.cards[0];
  const secondCard = hand.cards.pop();
  const isAceSplit = firstCard.rank === "A" && secondCard.rank === "A";

  balance -= hand.bets.main;

  const newHand = createEmptyHand(activeHandIndex + 1);
  newHand.cards = [secondCard, drawCard()];
  newHand.bets.main = hand.bets.main;
  newHand.bets.perfectPairs = 0;
  newHand.bets.twentyOneThree = 0;
  newHand.splitHand = true;

  hand.cards.push(drawCard());
  hand.splitHand = true;
  hand.blackjack = false;
  hand.result = "Split";

  if (isAceSplit) {
    hand.finished = true;
    hand.aceSplitLocked = true;
    hand.result = "Split Ace";

    newHand.finished = true;
    newHand.aceSplitLocked = true;
    newHand.result = "Split Ace";
  }

  hands.splice(activeHandIndex + 1, 0, newHand);
  refreshHandIndexes();

  if (isAceSplit) {
    messageText.textContent = "Aces split. One card dealt to each hand.";
    moveToNextHand();
    renderAll();
    return;
  }

  messageText.textContent = `Hand ${activeHandIndex + 1} split.`;

  renderAll();
}

function moveToNextHand() {
  const nextHand = hands.find((hand) => hand.bets.main > 0 && !hand.finished);

  if (nextHand) {
    activeHandIndex = nextHand.index;
    messageText.textContent = `Playing Hand ${activeHandIndex + 1}.`;
    return;
  }

  finishRound();
}

function playDealerHand() {
  dealerHoleHidden = false;

  const dealerHasBlackjack = isBlackjack(dealerHand);
  const needsDealerPlay = hands.some((hand) => {
    const value = getHandValue(hand.cards);
    return hand.bets.main > 0 && value <= 21 && !hand.blackjack && !dealerHasBlackjack;
  });

  if (!needsDealerPlay) {
    return;
  }

  while (getHandValue(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }
}

function finishRound() {
  roundFinished = true;
  roundStarted = false;
  dealerHoleHidden = false;

  playDealerHand();

  const dealerValue = getHandValue(dealerHand);
  const dealerHasBlackjack = isBlackjack(dealerHand);
  const dealerBust = dealerValue > 21;

  let totalMainPayout = 0;

  getActiveHands().forEach((hand) => {
    const playerValue = getHandValue(hand.cards);
    const playerHasBlackjack = isBlackjack(hand.cards) && !hand.splitHand;
    let payout = 0;

    if (playerHasBlackjack && dealerHasBlackjack) {
      payout = hand.bets.main;
      hand.result = "Push";
    } else if (playerHasBlackjack) {
      payout = hand.bets.main + Math.floor(hand.bets.main * 1.5);
      hand.result = "Blackjack win";
    } else if (dealerHasBlackjack) {
      payout = 0;
      hand.result = "Lose";
    } else if (playerValue > 21) {
      payout = 0;
      hand.result = "Bust";
    } else if (dealerBust) {
      payout = hand.bets.main * 2;
      hand.result = "Win";
    } else if (playerValue > dealerValue) {
      payout = hand.bets.main * 2;
      hand.result = "Win";
    } else if (playerValue < dealerValue) {
      payout = 0;
      hand.result = "Lose";
    } else {
      payout = hand.bets.main;
      hand.result = "Push";
    }

    totalMainPayout += payout;
    hand.finished = true;
  });

  balance += totalMainPayout;
  lastRoundNet = balance - roundStartBalance;
  currentRoundWin = Math.max(0, lastRoundNet);

  messageText.textContent = "Round finished.";

  if (balance <= 0) {
    messageText.textContent = "Round finished. You are out of chips.";
  }

  renderAll();
  saveState();
  scheduleAutoClear();
}

function startNewBuyIn() {
  clearAutoTimer();

  localStorage.removeItem("blackjackTotalBuyIn");
  localStorage.removeItem("blackjackBalance");
  localStorage.removeItem("blackjackLastBets");
  localStorage.removeItem("blackjackLastRoundNet");
  localStorage.removeItem("blackjackCurrentRoundWin");

  totalBuyIn = 0;
  balance = 0;
  lastBets = null;
  lastRoundNet = 0;
  currentRoundWin = 0;
  deck = createDeck();
  createHands();

  buyInInput.value = "10000";
  gameScreen.classList.add("hidden");
  buyInScreen.classList.remove("hidden");
}

chipButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chipButtons.forEach((chip) => chip.classList.remove("selected"));
    button.classList.add("selected");
    selectedChip = Number(button.dataset.chip);
  });
});

startGameBtn.addEventListener("click", startGame);

buyInInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startGame();
  }
});

clearBetsBtn.addEventListener("click", resetBets);
rebetBtn.addEventListener("click", applyRebet);
dealBtn.addEventListener("click", deal);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
doubleBtn.addEventListener("click", doubleDown);
splitBtn.addEventListener("click", splitHand);
newBuyInBtn.addEventListener("click", startNewBuyIn);

rulesBtn.addEventListener("click", () => {
  rulesModal.classList.remove("hidden");
});

closeRulesBtn.addEventListener("click", () => {
  rulesModal.classList.add("hidden");
});

rulesModal.addEventListener("click", (event) => {
  if (event.target === rulesModal) {
    rulesModal.classList.add("hidden");
  }
});

deck = createDeck();
createHands();
loadState();
renderAll();