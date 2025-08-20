// Copyright (C) 2017-2023 Smart code 203358507

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import throttle from 'lodash.throttle';
import { useRouteFocused } from 'stremio-router';
import { useProfile, useStreamingServer, withCoreSuspender } from 'stremio/common';
import { MainNavBars } from 'stremio/components';
import { useTranslation } from 'react-i18next';
import { SECTIONS } from './constants';
import Menu from './Menu';
import General from './General';
import Player from './Player';
import Streaming from './Streaming';
import Shortcuts from './Shortcuts';
import Info from './Info';
import styles from './Settings.less';

const Settings = () => {
    const { routeFocused } = useRouteFocused();
    const { t } = useTranslation();
    const profile = useProfile();
    const streamingServer = useStreamingServer();

    const sectionsContainerRef = useRef<HTMLDivElement>(null);
    const generalSectionRef = useRef<HTMLDivElement>(null);
    const playerSectionRef = useRef<HTMLDivElement>(null);
    const streamingServerSectionRef = useRef<HTMLDivElement>(null);
    const shortcutsSectionRef = useRef<HTMLDivElement>(null);

    const sections = useMemo(() => ([
        { ref: generalSectionRef, id: SECTIONS.GENERAL },
        { ref: playerSectionRef, id: SECTIONS.PLAYER },
        { ref: streamingServerSectionRef, id: SECTIONS.STREAMING },
        { ref: shortcutsSectionRef, id: SECTIONS.SHORTCUTS },
    ]), []);

    const [selectedSectionId, setSelectedSectionId] = useState(SECTIONS.GENERAL);

    const updateSelectedSectionId = useCallback(() => {
        const container = sectionsContainerRef.current;
        if (container!.scrollTop + container!.clientHeight >= container!.scrollHeight - 50) {
            setSelectedSectionId(sections[sections.length - 1].id);
        } else {
            for (let i = sections.length - 1; i >= 0; i--) {
                if (sections[i].ref.current!.offsetTop - container!.offsetTop <= container!.scrollTop) {
                    setSelectedSectionId(sections[i].id);
                    break;
                }
            }
        }
    }, []);

    const onMenuSelect = useCallback((event: React.MouseEvent<HTMLElement>) => {
        const section = sections.find((section) => {
            return section.id === event.currentTarget.dataset.section;
        });

        const container = sectionsContainerRef.current;
        if (section && container) {
            const node = section.ref.current as unknown as HTMLElement | null;
            const anchor = node?.parentElement ?? node; // scroll to section card wrapper when available
            if (anchor) {
                container.scrollTo({
                    top: anchor.offsetTop - container.offsetTop,
                    behavior: 'smooth'
                });
            }
        }
    }, []);

    const onContainerScroll = useCallback(throttle(() => {
        updateSelectedSectionId();
    }, 50), []);

    useLayoutEffect(() => {
        if (routeFocused) {
            updateSelectedSectionId();
        }
    }, [routeFocused]);

    return (
        <MainNavBars className={styles['settings-container']} route={'settings'} title={'SageStreams'}>
            <div className={classnames(styles['settings-content'], 'animation-fade-in')}>
                <Menu
                    selected={selectedSectionId}
                    streamingServer={streamingServer}
                    onSelect={onMenuSelect}
                />

                <div ref={sectionsContainerRef} className={styles['sections-container']} onScroll={onContainerScroll}>
                    <div className={styles['section-card']}>
                        <General
                            ref={generalSectionRef}
                            profile={profile}
                        />
                    </div>
                    <div className={styles['section-card']}>
                        <Player
                            ref={playerSectionRef}
                            profile={profile}
                        />
                    </div>
                    <div className={styles['section-card']}>
                        <Streaming
                            ref={streamingServerSectionRef}
                            profile={profile}
                            streamingServer={streamingServer}
                        />
                    </div>
                    <div className={styles['section-card']}>
                        <Shortcuts ref={shortcutsSectionRef} />
                    </div>
                    <div className={styles['section-card']}>
                        <Info streamingServer={streamingServer} />
                    </div>
                </div>
            </div>
        </MainNavBars>
    );
};

const SettingsFallback = () => (
    <MainNavBars className={styles['settings-container']} route={'settings'} title={'SageStreams'} />
);

export default withCoreSuspender(Settings, SettingsFallback);
