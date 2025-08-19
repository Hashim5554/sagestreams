// Copyright (C) 2017-2023 Smart code 203358507

import React, { memo } from 'react';
import classnames from 'classnames';
import { HorizontalNavBar } from 'stremio/components/NavBar';
import styles from './MainNavBars.less';

// Use known icon names that exist in the icon set
const TABS = [
	{ id: 'board', label: 'Board', icon: 'home', href: '#/' },
	{ id: 'discover', label: 'Discover', icon: 'discover', href: '#/discover' },
	{ id: 'library', label: 'Library', icon: 'library', href: '#/library' },
	{ id: 'sports', label: 'Sports', icon: '⚽', href: '#/sports', isEmoji: true },
	{ id: 'addons', label: 'ADDONS', icon: 'addons', href: '#/addons' },
	{ id: 'settings', label: 'SETTINGS', icon: 'settings', href: '#/settings' },
];

type Props = {
    className: string,
    route?: string,
    query?: string,
    title?: string,
    children?: React.ReactNode,
};

const MainNavBars = memo(({ className, route, query, title, children }: Props) => {
    return (
        <div className={classnames(className, styles['main-nav-bars-container'])}>
            <HorizontalNavBar
                className={styles['horizontal-nav-bar']}
                route={route}
                query={query}
                title={title}
                backButton={route === 'metadetails'}
                searchBar={true}
                fullscreenButton={true}
                navMenu={true}
                tabs={TABS}
                selected={route}
            />
            <div className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;

