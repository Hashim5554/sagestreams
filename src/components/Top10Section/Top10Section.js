const React = require('react');
const { useState, useEffect, useRef } = React;
const { motion } = require('framer-motion');
const styles = require('./styles.less');

const Top10Section = () => {
    const [topMovies, setTopMovies] = useState([]);
    const [topShows, setTopShows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const moviesContainerRef = useRef(null);
    const showsContainerRef = useRef(null);

    const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

    // ID mapping cache
    const ID_MAPPING_CACHE = new Map();

    const getImdbId = async (tmdbId, contentType) => {
        const cacheKey = `${contentType}_${tmdbId}`;
        if (ID_MAPPING_CACHE.has(cacheKey)) {
            return ID_MAPPING_CACHE.get(cacheKey);
        }

        try {
            const response = await fetch(
                `${TMDB_BASE_URL}/${contentType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
            );
            const data = await response.json();
            const imdbId = data.imdb_id;

            if (imdbId) {
                ID_MAPPING_CACHE.set(cacheKey, imdbId);
                return imdbId;
            }
        } catch (error) {
            console.error('Error fetching IMDb ID:', error);
        }
        return null;
    };

    const fetchTopContent = async () => {
        try {
            setLoading(true);

            // Fetch most watched movies this week
            const moviesResponse = await fetch(
                `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US&page=1`
            );
            const moviesData = await moviesResponse.json();

            // Fetch most watched TV shows this week
            const showsResponse = await fetch(
                `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=en-US&page=1`
            );
            const showsData = await showsResponse.json();

            // Process movies with IMDb IDs
            const processedMovies = await Promise.all(
                moviesData.results.slice(0, 10).map(async (movie) => {
                    const imdbId = await getImdbId(movie.id, 'movie');
                    return {
                        ...movie,
                        type: 'Movie',
                        imdbId,
                        posterPath: movie.poster_path,
                        title: movie.title,
                        overview: movie.overview,
                        rating: movie.vote_average,
                        year: new Date(movie.release_date).getFullYear(),
                        genre: movie.genre_ids
                    };
                })
            );

            // Process shows with IMDb IDs
            const processedShows = await Promise.all(
                showsData.results.slice(0, 10).map(async (show) => {
                    const imdbId = await getImdbId(show.id, 'tv');
                    return {
                        ...show,
                        type: 'Show',
                        imdbId,
                        posterPath: show.poster_path,
                        title: show.name,
                        overview: show.overview,
                        rating: show.vote_average,
                        year: new Date(show.first_air_date).getFullYear(),
                        genre: show.genre_ids
                    };
                })
            );

            setTopMovies(processedMovies);
            setTopShows(processedShows);
        } catch (error) {
            console.error('Error fetching top content:', error);
            // Fallback to mock data
            setTopMovies(mockTopMovies);
            setTopShows(mockTopShows);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopContent();
    }, []);

    // Smooth scrolling function with faster movement
    const smoothScroll = (containerRef, direction = 'left') => {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const scrollAmount = 5; // Slightly slower movement
        
        if (direction === 'left') {
            container.scrollLeft += scrollAmount;
        } else {
            container.scrollLeft -= scrollAmount;
        }
    };

    // Auto-scroll effect with hover pause functionality
    useEffect(() => {
        let moviesInterval;
        let showsInterval;

        if (!isHovering) {
            moviesInterval = setInterval(() => {
                smoothScroll(moviesContainerRef, 'left');
            }, 12); // Slightly slower scrolling

            showsInterval = setInterval(() => {
                smoothScroll(showsContainerRef, 'left');
            }, 12); // Slightly slower scrolling
        }

        return () => {
            if (moviesInterval) clearInterval(moviesInterval);
            if (showsInterval) clearInterval(showsInterval);
        };
    }, [isHovering]);

    // Infinite scroll reset - when reaching the end, smoothly reset to beginning
    useEffect(() => {
        const checkScrollPosition = () => {
            if (moviesContainerRef.current) {
                const container = moviesContainerRef.current;
                // Check if we've scrolled past the first set of items
                if (container.scrollLeft >= container.scrollWidth / 2) {
                    container.scrollLeft = 0; // Reset to beginning
                }
            }
            
            if (showsContainerRef.current) {
                const container = showsContainerRef.current;
                // Check if we've scrolled past the first set of items
                if (container.scrollLeft >= container.scrollWidth / 2) {
                    container.scrollLeft = 0; // Reset to beginning
                }
            }
        };

        const interval = setInterval(checkScrollPosition, 100);
        return () => clearInterval(interval);
    }, []);

    const handlePlayClick = (content) => {
        const contentType = content.type === 'Movie' ? 'movie' : 'series';
        
        if (!content.imdbId) {
            alert(`Cannot play ${content.title} - IMDb ID not available`);
            return;
        }

        // Navigate directly to the detail page using the mapped IMDb ID
        console.log(`Navigating to: #/detail/${contentType}/${content.imdbId}/${content.imdbId}`);
        window.location.hash = `#/detail/${contentType}/${content.imdbId}/${content.imdbId}`;
    };

    const renderTop10Item = (item, index, setIndex) => (
        <motion.div
            key={`${item.id}-${setIndex}-${index}`}
            className={styles['top10-item']}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
        >
            <div className={styles['rank-number']}>
                <motion.div 
                    className={styles['blur-number']}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {index + 1}
                </motion.div>
            </div>

            <div className={styles['poster-container']}>
                <motion.img
                    src={`${TMDB_IMAGE_BASE_URL}${item.posterPath}?crop=center&auto=format&q=80`}
                    alt={item.title}
                    className={styles['poster-image']}
                    onError={(e) => {
                        e.target.src = '/images/empty.png';
                    }}
                    whileHover={{
                        scale: 1.05,
                        transition: { duration: 0.2 }
                    }}
                />

                <motion.div
                    className={styles['play-overlay']}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.button
                        className={styles['play-button']}
                        onClick={() => handlePlayClick(item)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        ▶
                    </motion.button>
                </motion.div>
            </div>

            <div className={styles['item-info']}>
                <h3 className={styles['item-title']}>{item.title}</h3>
                <div className={styles['item-meta']}>
                    <span className={styles['item-year']}>{item.year}</span>
                    <span className={styles['item-rating']}>★ {item.rating}</span>
                </div>
            </div>
        </motion.div>
    );

    if (loading) {
        return (
            <div className={styles['top10-loading']}>
                <div className={styles['loading-spinner']}></div>
                <p>Loading Top 10 Content...</p>
            </div>
        );
    }

    return (
        <div className={styles['top10-section']}>
            {/* Top 10 Movies */}
            <div className={styles['top10-category']}>
                <div className={styles['category-header']}>
                    <h2 className={styles['category-title']}>🔥 Most Watched Movies This Week</h2>
                </div>
                <div 
                    ref={moviesContainerRef}
                    className={styles['top10-grid']}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {/* First set of items */}
                    {topMovies.map((movie, index) => renderTop10Item(movie, index, 1))}
                    {/* Duplicate set for infinite loop */}
                    {topMovies.map((movie, index) => renderTop10Item(movie, index, 2))}
                </div>
            </div>

            {/* Top 10 Shows */}
            <div className={styles['top10-category']}>
                <div className={styles['category-header']}>
                    <h2 className={styles['category-title']}>🔥 Most Watched Shows This Week</h2>
                </div>
                <div 
                    ref={showsContainerRef}
                    className={styles['top10-grid']}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {/* First set of items */}
                    {topShows.map((show, index) => renderTop10Item(show, index, 1))}
                    {/* Duplicate set for infinite loop */}
                    {topShows.map((show, index) => renderTop10Item(show, index, 2))}
                </div>
            </div>
        </div>
    );
};

// Mock data as fallback
const mockTopMovies = [
    {
        id: 1,
        type: 'Movie',
        imdbId: 'tt0111161',
        posterPath: '/images/empty.png',
        title: 'The Shawshank Redemption',
        overview: 'Two imprisoned men bond over a number of years...',
        rating: 9.3,
        year: 1994,
        genre: [18, 80]
    },
    // Add more mock movies...
];

const mockTopShows = [
    {
        id: 1,
        type: 'Show',
        imdbId: 'tt0944947',
        posterPath: '/images/empty.png',
        title: 'Game of Thrones',
        overview: 'Nine noble families fight for control...',
        rating: 9.3,
        year: 2011,
        genre: [18, 10759]
    },
    // Add more mock shows...
];

module.exports = Top10Section;
