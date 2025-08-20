// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const useTranslate = require('stremio/common/useTranslate');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { withCoreSuspender, getVisibleChildrenRange } = require('stremio/common');
const { Image, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const useSearch = require('./useSearch');
const styles = require('./styles');

const THRESHOLD = 100;

const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Simple mapping cache TMDB -> IMDb
const TMDB_IMDB_CACHE = new Map();

async function tmdbToImdb(tmdbId, contentType) {
    const key = `${contentType}_${tmdbId}`;
    if (TMDB_IMDB_CACHE.has(key)) return TMDB_IMDB_CACHE.get(key);
    try {
        const res = await fetch(`${TMDB_BASE_URL}/${contentType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
        const json = await res.json();
        const imdbId = json?.imdb_id || null;
        if (imdbId) TMDB_IMDB_CACHE.set(key, imdbId);
        return imdbId;
    } catch {
        return null;
    }
}

const Search = ({ queryParams }) => {
    const t = useTranslate();
    const [search, loadSearchRows] = useSearch(queryParams);
    const query = React.useMemo(() => {
        return search.selected !== null ?
            search.selected.extra.reduceRight((query, [name, value]) => {
                if (name === 'search') {
                    return value;
                }

                return query;
            }, null)
            :
            null;
    }, [search.selected]);
    const scrollContainerRef = React.useRef();
    const [tmdbItems, setTmdbItems] = React.useState([]);
    const onVisibleRangeChange = React.useCallback(() => {
        if (search.catalogs.length === 0) {
            return;
        }

        const range = getVisibleChildrenRange(scrollContainerRef.current, THRESHOLD);
        if (range === null) {
            return;
        }

        loadSearchRows(range);
    }, [search.catalogs]);
    const onScroll = React.useCallback(debounce(onVisibleRangeChange, 250), [onVisibleRangeChange]);

    // TMDB federated search with mapping to IMDb → Stremio deep links
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!query || query.length < 2) {
                setTmdbItems([]);
                return;
            }
            try {
                const [moviesRes, tvRes] = await Promise.all([
                    fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`),
                    fetch(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
                ]);
                const [moviesJson, tvJson] = await Promise.all([moviesRes.json(), tvRes.json()]);
                const items = [];
                for (const m of (moviesJson?.results || []).slice(0, 12)) {
                    const imdbId = await tmdbToImdb(m.id, 'movie');
                    if (!imdbId) continue;
                    items.push({
                        type: 'movie',
                        name: m.title,
                        poster: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
                        posterShape: 'poster',
                        deepLinks: {
                            metaDetailsStreams: `#/detail/movie/${imdbId}`,
                            metaDetailsVideos: `#/detail/movie/${imdbId}`
                        }
                    });
                }
                for (const tv of (tvJson?.results || []).slice(0, 12)) {
                    const imdbId = await tmdbToImdb(tv.id, 'tv');
                    if (!imdbId) continue;
                    items.push({
                        type: 'series',
                        name: tv.name,
                        poster: tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : null,
                        posterShape: 'poster',
                        deepLinks: {
                            metaDetailsStreams: `#/detail/series/${imdbId}`,
                            metaDetailsVideos: `#/detail/series/${imdbId}`
                        }
                    });
                }
                if (!cancelled) setTmdbItems(items);
            } catch {
                if (!cancelled) setTmdbItems([]);
            }
        })();
        return () => { cancelled = true; };
    }, [query]);
    React.useLayoutEffect(() => {
        onVisibleRangeChange();
    }, [search.catalogs, onVisibleRangeChange]);
    return (
        <MainNavBars className={styles['search-container']} route={'search'} query={query} title={'SageStreams'}>
            <div ref={scrollContainerRef} className={styles['search-content']} onScroll={onScroll}>
                {
                    query === null ?
                        <div className={classnames(styles['search-hints-wrapper'])}>
                            <div className={classnames(styles['search-hints-title-container'], 'animation-fade-in')}>
                                <div className={styles['search-hints-title']}>{t.string('SEARCH_ANYTHING')}</div>
                            </div>
                            <div className={classnames(styles['search-hints-container'], 'animation-fade-in')}>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'trailer'} />
                                    <div className={styles['label']}>{t.string('SEARCH_CATEGORIES')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'actors'} />
                                    <div className={styles['label']}>{t.string('SEARCH_PERSONS')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'link'} />
                                    <div className={styles['label']}>{t.string('SEARCH_PROTOCOLS')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'imdb-outline'} />
                                    <div className={styles['label']}>{t.string('SEARCH_TYPES')}</div>
                                </div>
                            </div>
                        </div>
                        :
                        search.catalogs.length === 0 ?
                            <div className={styles['message-container']}>
                                <Image
                                    className={styles['image']}
                                    src={require('/images/empty.png')}
                                    alt={' '}
                                />
                                <div className={styles['message-label']}>{ t.string('STREMIO_TV_SEARCH_NO_ADDONS') }</div>
                            </div>
                            :
                            <>
                                {tmdbItems.length > 0 && (
                                    <div className={classnames(styles['search-row'], styles['search-row-poster'], 'animation-fade-in')}>
                                        {tmdbItems.map((item, idx) => (
                                            <MetaItem
                                                key={`tmdb-${idx}`}
                                                className={classnames({})}
                                                type={item.type}
                                                name={item.name}
                                                poster={item.poster}
                                                posterShape={item.posterShape}
                                                playname={false}
                                                deepLinks={item.deepLinks}
                                            />
                                        ))}
                                    </div>
                                )}
                                {search.catalogs.map((catalog, index) => {
                                switch (catalog.content?.type) {
                                    case 'Ready': {
                                        return (
                                            <MetaRow
                                                key={index}
                                                className={classnames(styles['search-row'], styles[`search-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')}
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
                                                    className={classnames(styles['search-row'], 'animation-fade-in')}
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
                                                className={classnames(styles['search-row'], styles['search-row-poster'], 'animation-fade-in')}
                                                catalog={catalog}
                                                title={t.catalogTitle(catalog)}
                                            />
                                        );
                                    }
                                }
                            })
                }
            </div>
        </MainNavBars>
    );
};

Search.propTypes = {
    queryParams: PropTypes.instanceOf(URLSearchParams)
};

const SearchFallback = ({ queryParams }) => (
    <MainNavBars className={styles['search-container']} route={'search'} query={queryParams.get('search') ?? queryParams.get('query')} title={'SageStreams'} />
);

SearchFallback.propTypes = Search.propTypes;

module.exports = withCoreSuspender(Search, SearchFallback);
