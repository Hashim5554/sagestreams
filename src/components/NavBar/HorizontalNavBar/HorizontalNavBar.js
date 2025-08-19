// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, Image } = require('stremio/components');
const { default: useFullscreen } = require('stremio/common/useFullscreen');
const usePWA = require('stremio/common/usePWA');
const SearchBar = require('./SearchBar');
const NavMenu = require('./NavMenu');
const styles = require('./styles');
const { t } = require('i18next');

const HorizontalNavBar = React.memo(({ className, route, query, title, backButton, searchBar, fullscreenButton, navMenu, tabs, selected, ...props }) => {
    const backButtonOnClick = React.useCallback(() => {
        window.history.back();
    }, []);
    const [fullscreen, requestFullscreen, exitFullscreen] = useFullscreen();
    const [isIOSPWA] = usePWA();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const openMobileMenu = React.useCallback(() => setMobileMenuOpen(true), []);
    const closeMobileMenu = React.useCallback(() => setMobileMenuOpen(false), []);
    const onMobileTabClick = React.useCallback(() => setMobileMenuOpen(false), []);

    const renderNavMenuLabel = React.useCallback(({ ref, className, onClick, children, }) => (
        <Button ref={ref} className={classnames(className, styles['button-container'], styles['menu-button-container'])} tabIndex={-1} onClick={onClick}>
            <Icon className={styles['icon']} name={'person-outline'} />
            {children}
        </Button>
    ), []);

    // Split tabs for mobile drawer layout
    const topTabs = Array.isArray(tabs) ? tabs.filter((t) => t.id !== 'addons' && t.id !== 'settings') : [];
    const bottomTabs = Array.isArray(tabs) ? tabs.filter((t) => t.id === 'addons' || t.id === 'settings') : [];

    return (
        <nav {...props} className={classnames(className, styles['horizontal-nav-bar-container'])}>
            {
                backButton ?
                    <Button className={classnames(styles['button-container'], styles['back-button-container'])} tabIndex={-1} onClick={backButtonOnClick}>
                        <Icon className={styles['icon']} name={'chevron-back'} />
                    </Button>
                    :
                    <div className={styles['logo-container']}>
                        <Image
                            className={styles['logo']}
                            src={require('/images/stremio_symbol.png')}
                            alt={' '}
                        />
                    </div>
            }
            {
                typeof title === 'string' && title.length > 0 ?
                    <h2 className={styles['title']}>{title}</h2>
                    :
                    null
            }
            <div className={styles['center-container']}>
                {
                    searchBar && route !== 'addons' ?
                        <SearchBar className={styles['search-bar']} query={query} active={route === 'search'} />
                        :
                        null
                }
                {
                    Array.isArray(tabs) && tabs.length > 0 ?
                        <div className={styles['tabs-container']}>
                            {tabs.map((tab) => (
                                <Button key={tab.id} className={classnames(styles['tab-button'], { 'selected': tab.id === selected })} href={tab.href} tabIndex={-1}>
                                    {tab.isEmoji ? (
                                        <span className={styles['tab-icon']} style={{ fontSize: '1.6rem', lineHeight: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                                    ) : (
                                        <Icon className={styles['tab-icon']} name={tab.id === selected ? tab.icon : `${tab.icon}-outline`} />
                                    )}
                                    <div className={styles['tab-label']}>{t(tab.label)}</div>
                                </Button>
                            ))}
                        </div>
                        :
                        null
                }
            </div>
            {/* Standalone mobile hamburger (hide on details/back pages) */}
            {/* Ensure back button is visible on mobile even when other buttons hidden */}
            {backButton ? (
                <Button className={classnames(styles['button-container'], styles['back-button-container'], styles['mobile-visible-back'])} tabIndex={-1} onClick={backButtonOnClick}>
                    <Icon className={styles['icon']} name={'chevron-back'} />
                </Button>
            ) : (
                <Button className={classnames(styles['button-container'], styles['hamburger-button'])} tabIndex={-1} onClick={openMobileMenu}>
                    <span className={styles['hamburger-icon']}>☰</span>
                </Button>
            )}
            <div className={styles['buttons-container']}>
                {
                    !isIOSPWA && fullscreenButton ?
                        <Button className={styles['button-container']} title={fullscreen ? t('EXIT_FULLSCREEN') : t('ENTER_FULLSCREEN')} tabIndex={-1} onClick={fullscreen ? exitFullscreen : requestFullscreen}>
                            <Icon className={styles['icon']} name={fullscreen ? 'minimize' : 'maximize'} />
                        </Button>
                        :
                        null
                }
                {
                    navMenu ?
                        <NavMenu renderLabel={renderNavMenuLabel} />
                        :
                        null
                }
            </div>

            {/* Mobile drawer */}
            <div className={classnames(styles['mobile-drawer-overlay'], { 'open': mobileMenuOpen })} onClick={closeMobileMenu} />
            <div className={classnames(styles['mobile-drawer'], { 'open': mobileMenuOpen })} onClick={(e) => e.stopPropagation()}>
                <div className={styles['mobile-drawer-header']}>
                    <div className={styles['brand']}>
                        <Image
                            className={styles['brand-logo']}
                            src={require('/images/stremio_symbol.png')}
                            alt={' '}
                        />
                        <div className={styles['brand-title']}>SageStreams</div>
                    </div>
                    <Button className={styles['mobile-drawer-close']} tabIndex={-1} onClick={closeMobileMenu}>
                        <Icon className={styles['icon']} name={'close'} />
                    </Button>
                </div>
                {/* Floating mobile search */}
                <div className={styles['mobile-search-container']}>
                    <SearchBar className={styles['mobile-search-bar']} query={query} active={true} />
                </div>
                <div className={styles['mobile-drawer-tabs']}>
                    {topTabs.map((tab) => (
                        <Button key={tab.id} className={classnames(styles['mobile-drawer-tab'], { 'selected': tab.id === selected })} href={tab.href} tabIndex={-1} onClick={onMobileTabClick}>
                            {tab.isEmoji ? (
                                <span className={styles['tab-icon']} style={{ fontSize: '1.6rem', lineHeight: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                            ) : (
                                <Icon className={styles['tab-icon']} name={tab.id === selected ? tab.icon : `${tab.icon}-outline`} />
                            )}
                            <div className={styles['tab-label-text']}>{t(tab.label)}</div>
                        </Button>
                    ))}
                </div>
                {
                    bottomTabs.length > 0 ? (
                        <div className={styles['mobile-drawer-bottom']}>
                            {bottomTabs.map((tab) => (
                                <Button
                                    key={tab.id}
                                    className={classnames(
                                        styles['mobile-drawer-bottom-tab'],
                                        { 'selected': tab.id === selected },
                                        tab.id === 'settings' ? styles['bottom-settings'] : styles['bottom-addons']
                                    )}
                                    href={tab.href}
                                    tabIndex={-1}
                                    onClick={onMobileTabClick}
                                >
                                    <Icon className={styles['tab-icon']} name={tab.id === selected ? tab.icon : `${tab.icon}-outline`} />
                                    <div className={styles['tab-label-text']}>{t(tab.label)}</div>
                                </Button>
                            ))}
                        </div>
                    ) : null
                }
            </div>
        </nav>
    );
});

HorizontalNavBar.displayName = 'HorizontalNavBar';

HorizontalNavBar.propTypes = {
    className: PropTypes.string,
    route: PropTypes.string,
    query: PropTypes.string,
    title: PropTypes.string,
    backButton: PropTypes.bool,
    searchBar: PropTypes.bool,
    fullscreenButton: PropTypes.bool,
    navMenu: PropTypes.bool
};

module.exports = HorizontalNavBar;
