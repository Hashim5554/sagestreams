// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const useTranslate = require('stremio/common/useTranslate');
const { useStreamingServer, useNotifications, withCoreSuspender, getVisibleChildrenRange, useProfile } = require('stremio/common');
const { ContinueWatchingItem, EventModal, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const TrendingSlideshow = require('stremio/components/TrendingSlideshow');
const Top10Section = require('../../components/Top10Section');
const VerticalMovieRow = require('../../components/VerticalMovieRow');
const useBoard = require('./useBoard');
const useContinueWatchingPreview = require('./useContinueWatchingPreview');
const styles = require('./styles');
const { default: StreamingServerWarning } = require('./StreamingServerWarning');

const THRESHOLD = 5;

const Board = () => {
    const t = useTranslate();
    const streamingServer = useStreamingServer();
    const continueWatchingPreview = useContinueWatchingPreview();
    const [board, loadBoardRows] = useBoard();
    const notifications = useNotifications();
    const profile = useProfile();
    const boardCatalogsOffset = continueWatchingPreview.items.length > 0 ? 1 : 0;
    const scrollContainerRef = React.useRef();
    // Always treat streaming server warning as dismissed to avoid showing the banner
    const streamingServerWarningDismissed = true;
    const onVisibleRangeChange = React.useCallback(() => {
        const range = getVisibleChildrenRange(scrollContainerRef.current);
        if (range === null) {
            return;
        }

        const start = Math.max(0, range.start - boardCatalogsOffset - THRESHOLD);
        const end = range.end - boardCatalogsOffset + THRESHOLD;
        if (end < start) {
            return;
        }

        loadBoardRows({ start, end });
    }, [boardCatalogsOffset]);
    const onScroll = React.useCallback(debounce(onVisibleRangeChange, 250), [onVisibleRangeChange]);
    React.useLayoutEffect(() => {
        onVisibleRangeChange();
    }, [board.catalogs, onVisibleRangeChange]);
    return (
        <div className={styles['board-container']}>
            <EventModal />
            <MainNavBars className={styles['board-content-container']} route={'board'} title={'SageStreams'}>
                <div ref={scrollContainerRef} className={styles['board-content']} onScroll={onScroll}>
                    <TrendingSlideshow />
                    <Top10Section />
                    {
                        continueWatchingPreview.items.length > 0 ?
                            <MetaRow
                                className={classnames(styles['board-row'], styles['continue-watching-row'], 'animation-fade-in')}
                                title={t.string('BOARD_CONTINUE_WATCHING')}
                                catalog={continueWatchingPreview}
                                itemComponent={ContinueWatchingItem}
                                notifications={notifications}
                            />
                            :
                            null
                    }
                    {board.catalogs
                        .filter(catalog => {
                            // Hide only Torrentio catalogs on the home page
                            if (catalog.addon) {
                                const addonId = catalog.addon.manifest.id;
                                if (addonId === 'org.stremio.torrentio') {
                                    return false;
                                }
                                const addonName = catalog.addon.manifest.name || '';
                                if (addonName === 'Torrentio') {
                                    return false;
                                }
                            }
                            return true;
                        })
                        .map((catalog, index) => {
                        switch (catalog.content?.type) {
                            case 'Ready': {
                                const catalogTitle = t.catalogTitle(catalog);
                                const isFeaturedMovies = catalogTitle === 'Movies You May Like';
                                const isFeaturedSeries = catalogTitle === 'Series You May Like';
                                const isUsaTvCatalog = !!catalog.addon && (
                                    catalog.addon.manifest.id === 'com.usatv.addon' ||
                                    (catalog.addon.manifest.name || '') === 'USA TV'
                                );
                                
                                // Use VerticalMovieRow for featured sections
                                if (isFeaturedMovies || isFeaturedSeries) {
                                    return (
                                        <VerticalMovieRow
                                            key={index}
                                            title={catalogTitle}
                                            items={catalog.content.content}
                                            itemComponent={MetaItem}
                                        />
                                    );
                                }
                                
                                // Use regular MetaRow for other sections
                                return (
                                    <MetaRow
                                        key={index}
                                        className={classnames(styles['board-row'], styles[`board-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')}
                                        title={isUsaTvCatalog ? 'TV Channels' : undefined}
                                        catalog={catalog}
                                        itemComponent={MetaItem}
                                    />
                                );
                            }
                            case 'Err': {
                                if (catalog.content.content !== 'EmptyContent') {
                                    return (
                                        <MetaRow
                                            key={index}
                                            className={classnames(styles['board-row'], 'animation-fade-in')}
                                            title={(catalog.addon && (catalog.addon.manifest.id === 'com.usatv.addon' || (catalog.addon.manifest.name || '') === 'USA TV')) ? 'TV Channels' : undefined}
                                            catalog={catalog}
                                            message={catalog.content.content}
                                        />
                                    );
                                }
                                return null;
                            }
                            default: {
                                return (
                                    <MetaRow.Placeholder
                                        key={index}
                                        className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')}
                                        catalog={catalog}
                                        title={(catalog.addon && (catalog.addon.manifest.id === 'com.usatv.addon' || (catalog.addon.manifest.name || '') === 'USA TV')) ? 'TV Channels' : t.catalogTitle(catalog)}
                                    />
                                );
                            }
                        }
                    })}
                </div>
            </MainNavBars>
            {null}
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars className={styles['board-content-container']} route={'board'} title={'SageStreams'} />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
