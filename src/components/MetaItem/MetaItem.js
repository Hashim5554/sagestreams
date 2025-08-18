// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const filterInvalidDOMProps = require('filter-invalid-dom-props').default;
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Button } = require('stremio/components/Button');
const { default: Image } = require('stremio/components/Image');
const Multiselect = require('stremio/components/Multiselect');
const useBinaryState = require('stremio/common/useBinaryState');
const { ICON_FOR_TYPE } = require('stremio/common/CONSTANTS');
const styles = require('./styles');

// Storage key for tracking played content
const PLAYED_CONTENT_STORAGE_KEY = 'stremio_played_content';

// Helper function to get played content from localStorage
const getPlayedContent = () => {
    try {
        const stored = localStorage.getItem(PLAYED_CONTENT_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading played content from localStorage:', error);
        return {};
    }
};

// Helper function to save played content to localStorage
const savePlayedContent = (playedContent) => {
    try {
        localStorage.setItem(PLAYED_CONTENT_STORAGE_KEY, JSON.stringify(playedContent));
    } catch (error) {
        console.error('Error saving played content to localStorage:', error);
    }
};

// Helper function to mark content as played
const markContentAsPlayed = (contentId) => {
    const playedContent = getPlayedContent();
    playedContent[contentId] = {
        playedAt: Date.now(),
        lastPlayed: Date.now(),
        hasBeenPlayed: true
    };
    savePlayedContent(playedContent);
};

// Helper function to check if content has been played before
const hasBeenPlayed = (contentId) => {
    const playedContent = getPlayedContent();
    const content = playedContent[contentId];
    return content && content.hasBeenPlayed;
};

// Helper function to get content ID from deepLinks
const getContentId = (deepLinks) => {
    if (!deepLinks) return null;
    
    // Try to extract ID from various deepLinks
    if (deepLinks.metaDetailsVideos) {
        const match = deepLinks.metaDetailsVideos.match(/\/detail\/[^\/]+\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    if (deepLinks.metaDetailsStreams) {
        const match = deepLinks.metaDetailsStreams.match(/\/detail\/[^\/]+\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    if (deepLinks.player) {
        const match = deepLinks.player.match(/\/player\/[^\/]+\/[^\/]+\/[^\/]+\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    return null;
};

const MetaItem = React.memo(({ className, type, name, description, poster, posterShape, posterChangeCursor, progress, newVideos, options, deepLinks, dataset, optionOnSelect, onDismissClick, onPlayClick, watched, ...props }) => {
    const { t } = useTranslation();
    const [menuOpen, onMenuOpen, onMenuClose] = useBinaryState(false);
    
    // Get content ID for tracking
    const contentId = React.useMemo(() => getContentId(deepLinks), [deepLinks]);
    
    // Check if content has been played before
    const hasPlayed = React.useMemo(() => {
        return contentId ? hasBeenPlayed(contentId) : false;
    }, [contentId]);
    
    // Determine the appropriate href based on play status
    const href = React.useMemo(() => {
        if (!deepLinks) return null;
        
        if (hasPlayed) {
            // If played before, go directly to player
            return typeof deepLinks.player === 'string' ?
                deepLinks.player
                :
                typeof deepLinks.metaDetailsStreams === 'string' ?
                    deepLinks.metaDetailsStreams
                    :
                    typeof deepLinks.metaDetailsVideos === 'string' ?
                        deepLinks.metaDetailsVideos
                        :
                        null;
        } else {
            // If never played, go to details first
            return typeof deepLinks.metaDetailsVideos === 'string' ?
                deepLinks.metaDetailsVideos
                :
                typeof deepLinks.metaDetailsStreams === 'string' ?
                    deepLinks.metaDetailsStreams
                    :
                    typeof deepLinks.player === 'string' ?
                        deepLinks.player
                        :
                        null;
        }
    }, [deepLinks, hasPlayed]);
    
    const metaItemOnClick = React.useCallback((event) => {
        // Navigate to details page when clicking on the card
        if (deepLinks?.metaDetailsVideos ?? deepLinks?.metaDetailsStreams) {
            window.location = deepLinks?.metaDetailsVideos ?? deepLinks?.metaDetailsStreams;
        }
    }, [deepLinks]);
    
    const menuOnClick = React.useCallback((event) => {
        event.nativeEvent.selectPrevented = true;
    }, []);
    
    const menuOnSelect = React.useCallback((event) => {
        if (typeof optionOnSelect === 'function') {
            optionOnSelect({
                type: 'select-option',
                value: event.value,
                dataset: dataset,
                reactEvent: event.reactEvent,
                nativeEvent: event.nativeEvent
            });
        }
    }, [dataset, optionOnSelect]);
    
    // Enhanced play click handler
    const handlePlayClick = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        
        if (contentId) {
            // Mark as played when button is clicked
            markContentAsPlayed(contentId);
        }
        
        if (typeof onPlayClick === 'function') {
            onPlayClick(event);
        }
    }, [contentId, onPlayClick]);

    // Details click handler
    const handleDetailsClick = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        
        // Navigate to details page
        if (deepLinks?.metaDetailsVideos ?? deepLinks?.metaDetailsStreams) {
            window.location = deepLinks?.metaDetailsVideos ?? deepLinks?.metaDetailsStreams;
        }
    }, [deepLinks]);
    
    const renderPosterFallback = React.useCallback(() => (
        <Icon
            className={styles['placeholder-icon']}
            name={ICON_FOR_TYPE.has(type) ? ICON_FOR_TYPE.get(type) : ICON_FOR_TYPE.get('other')}
        />
    ), [type]);
    
    const renderMenuLabelContent = React.useCallback(() => (
        <Icon className={styles['icon']} name={'more-vertical'} />
    ), []);

    // Function to truncate description text
    const truncateDescription = React.useCallback((text, maxLength = 300) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }, []);
    
    // Choose wrapper: when used in Continue Watching, use a div to avoid nested interactive elements
    const WrapperComponent = onPlayClick ? 'div' : Button;
    const wrapperProps = onPlayClick
        ? { title: name, ...filterInvalidDOMProps(props), className: classnames(className, styles['meta-item-container'], styles['poster-shape-poster'], styles[`poster-shape-${posterShape}`], { 'active': menuOpen }), onClick: metaItemOnClick, role: 'group' }
        : { title: name, href, ...filterInvalidDOMProps(props), className: classnames(className, styles['meta-item-container'], styles['poster-shape-poster'], styles[`poster-shape-${posterShape}`], { 'active': menuOpen }), onClick: metaItemOnClick };

    return (
        <WrapperComponent {...wrapperProps}>
            <div className={classnames(styles['poster-container'], { 'poster-change-cursor': posterChangeCursor })}>
                {
                    onDismissClick ?
                        <div title={t('LIBRARY_RESUME_DISMISS')} className={styles['dismiss-icon-layer']} onClick={onDismissClick}>
                            <Icon className={styles['dismiss-icon']} name={'close'} />
                            <div className={styles['dismiss-icon-backdrop']} />
                        </div>
                        :
                        null
                }
                {
                    watched ?
                        <div className={styles['watched-icon-layer']}>
                            <Icon className={styles['watched-icon']} name={'checkmark'} />
                        </div>
                        :
                        null
                }
                <div className={styles['poster-image-layer']}>
                    <Image
                        className={styles['poster-image']}
                        src={poster}
                        alt={' '}
                        renderFallback={renderPosterFallback}
                    />
                </div>
                {
                    onPlayClick ?
                        <div 
                            title={t('CONTINUE_WATCHING')} 
                            className={styles['play-icon-layer']} 
                            onClick={handlePlayClick}
                        >
                            <Icon className={styles['play-icon']} name={'play'} />
                            <div className={styles['play-icon-outer']} />
                            <div className={styles['play-icon-background']} />
                        </div>
                        :
                        null
                }
                {
                    // Details button - only show in Continue Watching (when onPlayClick is provided)
                    onPlayClick ?
                        (() => {
                            const detailsHref = (typeof deepLinks?.metaDetailsVideos === 'string' && deepLinks.metaDetailsVideos) || (typeof deepLinks?.metaDetailsStreams === 'string' && deepLinks.metaDetailsStreams) || null;
                            if (!detailsHref) return null;
                            return (
                                <Button
                                    className={styles['details-button-layer']}
                                    href={detailsHref}
                                    onMouseDown={(e) => { e.stopPropagation(); }}
                                    onClick={(e) => { e.stopPropagation(); }}
                                    tabIndex={0}
                                    title={t('DETAILS')}
                                >
                                    {t('DETAILS')}
                                </Button>
                            );
                        })()
                        :
                        null
                }
                {
                    // Description overlay - show on hover for all sections except Continue Watching
                    !onPlayClick && typeof description === 'string' && description.length > 0 ?
                        <div className={styles['description-overlay']}>
                            <div className={styles['description-content']}>
                                {truncateDescription(description)}
                            </div>
                        </div>
                        :
                        null
                }
                {
                    progress > 0 ?
                        <div className={styles['progress-bar-layer']}>
                            <div className={styles['progress-bar']} style={{ width: `${progress}%` }} />
                            <div className={styles['progress-bar-background']} />
                        </div>
                        :
                        null
                }
                {
                    newVideos > 0 ?
                        <div className={styles['new-videos']}>
                            <div className={styles['layer']} />
                            <div className={styles['layer']} />
                            <div className={styles['layer']}>
                                <Icon className={styles['icon']} name={'add'} />
                                <div className={styles['label']}>
                                    {newVideos}
                                </div>
                            </div>
                        </div>
                        :
                        null
                }
            </div>
            {
                (typeof name === 'string' && name.length > 0) || (Array.isArray(options) && options.length > 0) ?
                    <div className={styles['title-bar-container']}>
                        <div className={styles['title-label']}>
                            {typeof name === 'string' && name.length > 0 ? name : ''}
                        </div>
                        {
                            Array.isArray(options) && options.length > 0 ?
                                <Multiselect
                                    className={styles['menu-label-container']}
                                    renderLabelContent={renderMenuLabelContent}
                                    options={options}
                                    onOpen={onMenuOpen}
                                    onClose={onMenuClose}
                                    onSelect={menuOnSelect}
                                    tabIndex={-1}
                                    onClick={menuOnClick}
                                />
                                :
                                null
                        }
                    </div>
                    :
                    null
            }
        </WrapperComponent>
    );
});

MetaItem.displayName = 'MetaItem';

MetaItem.propTypes = {
    className: PropTypes.string,
    type: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    poster: PropTypes.string,
    posterShape: PropTypes.oneOf(['poster', 'landscape', 'square']),
    posterChangeCursor: PropTypes.bool,
    progress: PropTypes.number,
    newVideos: PropTypes.number,
    options: PropTypes.array,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    dataset: PropTypes.object,
    optionOnSelect: PropTypes.func,
    onDismissClick: PropTypes.func,
    onPlayClick: PropTypes.func,
    onClick: PropTypes.func,
    watched: PropTypes.bool
};

module.exports = MetaItem;
