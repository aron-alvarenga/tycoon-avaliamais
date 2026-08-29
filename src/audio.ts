export const menuMusic = new Audio('/src/assets/sound/menu-principal.mp3');
menuMusic.loop = true;
menuMusic.volume = 0.5;

export const gameMusic = new Audio('/src/assets/sound/game.mp3');
gameMusic.loop = true;
gameMusic.volume = 0.3;

export const clickSound = new Audio('/src/assets/sound/Menu Selection Click.wav');
clickSound.volume = 0.8;

let isMenuMusicIntended = true;

export function playMenuMusic() {
    isMenuMusicIntended = true;
    gameMusic.pause();
    gameMusic.currentTime = 0;

    menuMusic.play().catch(() => {
        // Autoplay error (user didn't interact yet)
        const unlock = () => {
            if (isMenuMusicIntended) {
                menuMusic.play().catch(() => { });
            }
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    });
}

export function playGameMusic() {
    isMenuMusicIntended = false;
    menuMusic.pause();
    menuMusic.currentTime = 0;

    gameMusic.play().catch(() => {
        // Autoplay error
        const unlock = () => {
            if (!isMenuMusicIntended) {
                gameMusic.play().catch(() => { });
            }
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    });
}

export function playClickSound() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => { });
}

export function initAudio() {
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Play sound on button clicks or any other option you might have
        if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('.btn')) {
            playClickSound();
        }
    });
}
