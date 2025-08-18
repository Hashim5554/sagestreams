// Copyright (C) 2017-2023 Smart code 203358507

import { useCallback, useEffect, useState } from 'react';
import useShell, { type WindowVisibility } from './useShell';
import useSettings from './useSettings';

const useFullscreen = () => {
    const shell = useShell();
    const [settings] = useSettings();

    const [fullscreen, setFullscreen] = useState(false);

    const requestFullscreen = useCallback(async () => {
        if (shell.active) {
            shell.send('win-set-visibility', { fullscreen: true });
        } else {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                // Some browsers may reject the promise if not initiated by a user gesture
                // or if permissions disallow fullscreen. We fail gracefully.
                // eslint-disable-next-line no-console
                console.warn('Fullscreen request failed:', err);
            }
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        if (shell.active) {
            shell.send('win-set-visibility', { fullscreen: false });
        } else {
            try {
                if (document.fullscreenElement === document.documentElement && document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('Exit fullscreen failed:', err);
            }
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        fullscreen ? exitFullscreen() : requestFullscreen();
    }, [fullscreen]);

    useEffect(() => {
        const onWindowVisibilityChanged = (state: WindowVisibility) => {
            setFullscreen(state.isFullscreen === true);
        };

        const onFullscreenChange = () => {
            setFullscreen(document.fullscreenElement === document.documentElement);
        };

        const onKeyDown = (event: KeyboardEvent) => {

            const activeElement = document.activeElement as HTMLElement;

            const inputFocused =
                activeElement &&
                (activeElement.tagName === 'INPUT' ||
                 activeElement.tagName === 'TEXTAREA' ||
                 activeElement.tagName === 'SELECT' ||
                 activeElement.isContentEditable);

            if (event.code === 'Escape' && settings.escExitFullscreen) {
                exitFullscreen();
            }

            if (event.code === 'KeyF' && !inputFocused) {
                toggleFullscreen();
            }

            if (event.code === 'F11' && shell.active) {
                toggleFullscreen();
            }
        };

        shell.on('win-visibility-changed', onWindowVisibilityChanged);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => {
            shell.off('win-visibility-changed', onWindowVisibilityChanged);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, [settings.escExitFullscreen, toggleFullscreen]);

    return [fullscreen, requestFullscreen, exitFullscreen, toggleFullscreen];
};

export default useFullscreen;
