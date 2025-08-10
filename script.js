// Game Constants
const CARD_DEAL_DELAY = 300;
const DEALER_TURN_DELAY = 1000;
const SHAKE_THRESHOLD = 15;
const CLICK_DELAY = 500;
const VIBRATION_DURATION = 50;
const BLACKJACK_SCORE = 21;
const DEALER_STAND_SCORE = 17;

// UI Elements
const elements = {
    hitButton: document.getElementById('hit-button'),
    standButton: document.getElementById('stand-button'),
    newGameButton: document.getElementById('new-game-button'),
    playerHand: document.getElementById('player-hand'),
    dealerHand: document.getElementById('dealer-hand'),
    playerScore: document.getElementById('player-score'),
    dealerScore: document.getElementById('dealer-score'),
    result: document.getElementById('result'),
    winsCount: document.getElementById('wins-count'),
    lossesCount: document.getElementById('losses-count'),
    touchProtector: document.getElementById('touch-protector'),
    loadingScreen: document.getElementById('loading-screen'),
    gameContainer: document.getElementById('game-container'),
    progressBar: document.getElementById('progress-bar'),
    hapticFeedback: document.getElementById('haptic-feedback')
};

// Game State
const state = {
    deck: [],
    playerCards: [],
    dealerCards: [],
    gameOver: false,
    winsCount: 0,
    lossesCount: 0,
    lastClickTime: 0,
    isShakeEnabled: true,
    lastShakeTime: 0
};

// Initialize game
function initGame() {
    resetUI();
    createAndShuffleDeck();
    dealInitialCards();
}

function resetUI() {
    elements.result.textContent = '';
    elements.result.className = '';
    elements.hitButton.classList.remove('pulse');
    elements.playerHand.innerHTML = '';
    elements.dealerHand.innerHTML = '';
    elements.playerScore.textContent = 'Score: 0';
    elements.dealerScore.textContent = 'Score: ?';
}

function createAndShuffleDeck() {
    state.deck = [];
    const suits = ['♥', '♦', '♠', '♣'];
    
    for (let suit of suits) {
        for (let j = 1; j <= 13; j++) {
            state.deck.push({
                value: j > 10 ? 10 : (j === 1 ? 11 : j),
                suit: suit,
                isRed: suit === '♥' || suit === '♦'
            });
        }
    }
    
    shuffleDeck(state.deck);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealInitialCards() {
    state.playerCards = [];
    state.dealerCards = [];
    state.gameOver = false;
    
    dealCardWithDelay('player', 0)
        .then(() => dealCardWithDelay('dealer', CARD_DEAL_DELAY))
        .then(() => dealCardWithDelay('player', CARD_DEAL_DELAY))
        .then(() => dealCardWithDelay('dealer', CARD_DEAL_DELAY))
        .then(() => {
            if (calculateScore(state.playerCards) === BLACKJACK_SCORE) {
                setTimeout(stand, 1000);
            }
        });
}

function dealCardWithDelay(target, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            const card = drawCard();
            if (target === 'player') {
                state.playerCards.push(card);
            } else {
                state.dealerCards.push(card);
            }
            updateUI();
            vibrate();
            resolve();
        }, delay);
    });
}

function drawCard() {
    if (state.deck.length === 0) {
        createAndShuffleDeck();
    }
    return state.deck.pop();
}

function calculateScore(cards) {
    let score = cards.reduce((sum, card) => sum + card.value, 0);
    let aces = cards.filter(card => card.value === 11).length;
    
    while (score > BLACKJACK_SCORE && aces > 0) {
        score -= 10;
        aces--;
    }
    
    return score;
}

function createCardElement(card, hidden = false) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${hidden ? 'hidden' : ''} ${card.isRed ? 'red' : ''}`;
    
    if (!hidden) {
        let cardSymbol;
        switch(card.value) {
            case 11: cardSymbol = 'A'; break;
            case 12: cardSymbol = 'J'; break;
            case 13: cardSymbol = 'Q'; break;
            case 10: cardSymbol = 'K'; break;
            default: cardSymbol = card.value;
        }
        cardElement.textContent = `${cardSymbol}${card.suit}`;
    }
    
    cardElement.classList.add('dealing');
    setTimeout(() => cardElement.classList.remove('dealing'), 500);
    
    return cardElement;
}

function updateUI() {
    elements.playerHand.innerHTML = '';
    elements.dealerHand.innerHTML = '';
    
    // Player cards
    state.playerCards.forEach(card => {
        elements.playerHand.appendChild(createCardElement(card));
    });
    
    // Dealer cards
    state.dealerCards.forEach((card, index) => {
        elements.dealerHand.appendChild(createCardElement(card, index === 0 && !state.gameOver));
    });
    
    const playerScore = calculateScore(state.playerCards);
    elements.playerScore.textContent = `Score: ${playerScore}`;
    
    if (state.gameOver) {
        const dealerScore = calculateScore(state.dealerCards);
        elements.dealerScore.textContent = `Score: ${dealerScore}`;
    } else {
        elements.dealerScore.textContent = `Score: ?`;
    }
    
    if (playerScore > BLACKJACK_SCORE && !state.gameOver) {
        setTimeout(stand, 800);
    }
}

function hit() {
    const now = Date.now();
    if (state.gameOver || now - state.lastClickTime < CLICK_DELAY) return;
    state.lastClickTime = now;
    
    elements.touchProtector.style.display = 'block';
    setTimeout(() => {
        elements.touchProtector.style.display = 'none';
    }, CLICK_DELAY);
    
    setTimeout(() => {
        state.playerCards.push(drawCard());
        updateUI();
        vibrate();
        
        if (calculateScore(state.playerCards) > BLACKJACK_SCORE) {
            elements.hitButton.classList.add('pulse');
        } else {
            elements.hitButton.classList.remove('pulse');
        }
    }, 100);
}

function stand() {
    const now = Date.now();
    if (state.gameOver || now - state.lastClickTime < CLICK_DELAY) return;
    state.lastClickTime = now;
    
    elements.touchProtector.style.display = 'block';
    setTimeout(() => {
        elements.touchProtector.style.display = 'none';
    }, CLICK_DELAY);
    
    state.gameOver = true;
    elements.hitButton.classList.remove('pulse');
    
    // First reveal dealer's hidden card
    setTimeout(() => {
        updateUI();
        
        // Then start dealer's turn
        const dealerTakeCards = setInterval(() => {
            if (calculateScore(state.dealerCards) < DEALER_STAND_SCORE) {
                state.dealerCards.push(drawCard());
                updateUI();
                vibrate();
            } else {
                clearInterval(dealerTakeCards);
                updateUI();
                determineWinner();
            }
        }, DEALER_TURN_DELAY);
    }, 500);
}

function determineWinner() {
    const playerScore = calculateScore(state.playerCards);
    const dealerScore = calculateScore(state.dealerCards);
    let result = '';
    let isWin = false;
    
    if (playerScore > BLACKJACK_SCORE) {
        result = 'BUST! YOU LOSE';
        state.lossesCount++;
    } else if (dealerScore > BLACKJACK_SCORE) {
        result = 'DEALER BUSTED! YOU WIN!';
        isWin = true;
        state.winsCount++;
    } else if (playerScore === dealerScore) {
        result = 'PUSH!';
    } else if (playerScore === BLACKJACK_SCORE && state.playerCards.length === 2) {
        result = 'BLACKJACK! YOU WIN!';
        isWin = true;
        state.winsCount++;
    } else if (playerScore > dealerScore) {
        result = 'YOU WIN!';
        isWin = true;
        state.winsCount++;
    } else {
        result = 'YOU LOSE';
        state.lossesCount++;
    }
    
    elements.result.textContent = result;
    elements.winsCount.textContent = state.winsCount;
    elements.lossesCount.textContent = state.lossesCount;
    
    if (isWin) {
        elements.result.style.color = '#4CAF50';
        const winEffect = document.createElement('div');
        winEffect.className = 'win-animation';
        document.body.appendChild(winEffect);
        setTimeout(() => winEffect.remove(), 1000);
        vibrate(100);
    } else {
        elements.result.style.color = '#F44336';
        vibrate(200);
    }
    
    saveStats();
}

function saveStats() {
    localStorage.setItem('blackjackStats', JSON.stringify({
        wins: state.winsCount,
        losses: state.lossesCount
    }));
}

function loadStats() {
    const savedStats = localStorage.getItem('blackjackStats');
    if (savedStats) {
        const stats = JSON.parse(savedStats);
        state.winsCount = stats.wins || 0;
        state.lossesCount = stats.losses || 0;
        elements.winsCount.textContent = state.winsCount;
        elements.lossesCount.textContent = state.lossesCount;
    }
}

function vibrate(duration = VIBRATION_DURATION) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    } else {
        elements.hapticFeedback.classList.add('vibrate');
        setTimeout(() => {
            elements.hapticFeedback.classList.remove('vibrate');
        }, 300);
    }
}

function setupEventListeners() {
    const addActionListener = (element, handler) => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (Date.now() - state.lastClickTime < CLICK_DELAY) return;
            state.lastClickTime = Date.now();
            handler();
        }, { passive: false });
    };

    addActionListener(elements.hitButton, hit);
    addActionListener(elements.standButton, stand);
    addActionListener(elements.newGameButton, initGame);

    // Shake detection
    window.addEventListener('devicemotion', handleShake);
}

function handleShake(e) {
    if (!state.isShakeEnabled) return;
    
    const acceleration = e.accelerationIncludingGravity;
    const now = Date.now();
    
    if ((Math.abs(acceleration.x) > SHAKE_THRESHOLD || 
        Math.abs(acceleration.y) > SHAKE_THRESHOLD || 
        Math.abs(acceleration.z) > SHAKE_THRESHOLD) &&
        now - state.lastShakeTime > 1000) {
        
        state.lastShakeTime = now;
        state.isShakeEnabled = false;
        vibrate(100);
        initGame();
        
        setTimeout(() => {
            state.isShakeEnabled = true;
        }, 2000);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Simulate loading progress
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += 5;
        elements.progressBar.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(loadingInterval);
            elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                elements.loadingScreen.style.display = 'none';
                elements.gameContainer.style.opacity = '1';
                loadStats();
                setupEventListeners();
                initGame();
            }, 500);
        }
    }, 100);
});

// Prevent default touch behavior
document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) e.preventDefault();
}, { passive: false });

// Keep screen on
document.addEventListener('deviceready', () => {
    if (window.plugins && window.plugins.insomnia) {
        window.plugins.insomnia.keepAwake();
    }
}, false);