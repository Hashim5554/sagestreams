const React = require('react');
const classnames = require('classnames');
const { motion, AnimatePresence } = require('framer-motion');
const styles = require('./styles');

// TMDB API Configuration
const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77'; // Free public key for demo
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// ID Mapping System: TMDB ID -> IMDb ID
const ID_MAPPING_CACHE = new Map();

// Function to get IMDb ID from TMDB ID
const getImdbId = async (tmdbId, contentType) => {
    // Check cache first
    if (ID_MAPPING_CACHE.has(`${contentType}_${tmdbId}`)) {
        return ID_MAPPING_CACHE.get(`${contentType}_${tmdbId}`);
    }

    try {
        // Fetch external IDs from TMDB
        const response = await fetch(
            `${TMDB_BASE_URL}/${contentType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
        );
        const data = await response.json();
        
        const imdbId = data.imdb_id;
        
        // Cache the result
        if (imdbId) {
            ID_MAPPING_CACHE.set(`${contentType}_${tmdbId}`, imdbId);
        }
        
        return imdbId;
    } catch (error) {
        console.error(`Error fetching IMDb ID for ${contentType} ${tmdbId}:`, error);
        return null;
    }
};

// Animation variants
const containerVariants = {
    hidden: { 
        opacity: 0,
        scale: 0.95,
        rotateX: -5,
        rotateY: -2
    },
    visible: { 
        opacity: 1,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        transition: {
            duration: 0.6,
            ease: "easeOut"
        }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        rotateX: 5,
        rotateY: 2,
        transition: {
            duration: 0.4,
            ease: "easeIn"
        }
    }
};

const cardVariants = {
    hidden: {
        y: 20,
        opacity: 0,
        scale: 0.9
    },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
};

const posterVariants = {
    hidden: {
        x: -30,
        opacity: 0,
        scale: 0.8
    },
    visible: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.6,
            ease: "easeOut",
            delay: 0.1
        }
    }
};

const contentVariants = {
    hidden: {
        x: 30,
        opacity: 0,
        scale: 0.8
    },
    visible: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.6,
            ease: "easeOut",
            delay: 0.2
        }
    }
};

const statsVariants = {
    hidden: {
        y: 20,
        opacity: 0
    },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: "easeOut",
            delay: 0.3
        }
    }
};

const indicatorsVariants = {
    hidden: {
        y: 15,
        opacity: 0
    },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: "easeOut",
            delay: 0.4
        }
    }
};

// Trending content from TMDB API
const TrendingSlideshow = () => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isHovered, setIsHovered] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);
    const [trendingContent, setTrendingContent] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Fetch trending movies and TV shows from TMDB
    React.useEffect(() => {
        const fetchTrendingContent = async () => {
            try {
                setLoading(true);
                
                // Fetch trending movies
                const moviesResponse = await fetch(
                    `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US`
                );
                const moviesData = await moviesResponse.json();
                
                // Fetch trending TV shows
                const tvResponse = await fetch(
                    `${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=en-US`
                );
                const tvData = await tvResponse.json();
                
                // Combine and format the data
                const combinedContent = [];
                
                // Process movies
                for (const movie of moviesData.results.slice(0, 3)) {
                    const imdbId = await getImdbId(movie.id, 'movie');
                    combinedContent.push({
                        id: movie.id,
                        imdbId: imdbId, // Store IMDb ID for Stremio routing
                        title: movie.title,
                        type: 'Movie',
                        description: movie.overview || 'No description available.',
                        poster: `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`,
                        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
                        year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
                        genre: movie.genre_ids ? getGenreNames(movie.genre_ids) : 'Unknown Genre'
                    });
                }
                
                // Process TV shows
                for (const tv of tvData.results.slice(0, 2)) {
                    const imdbId = await getImdbId(tv.id, 'tv');
                    combinedContent.push({
                        id: tv.id,
                        imdbId: imdbId, // Store IMDb ID for Stremio routing
                        title: tv.name,
                        type: 'Show',
                        description: tv.overview || 'No description available.',
                        poster: `${TMDB_IMAGE_BASE_URL}${tv.poster_path}`,
                        rating: tv.vote_average ? tv.vote_average.toFixed(1) : 'N/A',
                        year: tv.first_air_date ? tv.first_air_date.split('-')[0] : 'Unknown',
                        genre: tv.genre_ids ? getGenreNames(tv.genre_ids) : 'Unknown Genre'
                    });
                }
                
                setTrendingContent(combinedContent);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching trending content:', error);
                setLoading(false);
                // Fallback to mock data if API fails
                setTrendingContent(getMockContent());
            }
        };

        fetchTrendingContent();
    }, []);

    // Get genre names from genre IDs
    const getGenreNames = (genreIds) => {
        const genres = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
            80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
            14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
            9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
            53: 'Thriller', 10752: 'War', 37: 'Western'
        };
        
        return genreIds.slice(0, 3).map(id => genres[id] || 'Unknown').join(', ');
    };

    // Mock content as fallback
    const getMockContent = () => [
        {
            id: 1,
            imdbId: 'tt5950044', // Example IMDb ID
            title: "The Last Kingdom",
            type: "Show",
            description: "A tale of power, loyalty, and revenge set in the time of King Alfred the Great.",
            poster: "https://images.unsplash.com/photo-1489599835387-957764d17ead?w=800&h=1200&fit=crop&crop=center&auto=format&q=80",
            rating: "8.5",
            year: "2022",
            genre: "Action, Drama, History"
        },
        {
            id: 2,
            imdbId: 'tt0816692', // Example IMDb ID
            title: "Interstellar",
            type: "Movie",
            description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
            poster: "https://images.unsplash.com/photo-1446776811953-b23d0bd843ac?w=800&h=1200&fit=crop&crop=center&auto=format&q=80",
            rating: "8.6",
            year: "2014",
            genre: "Adventure, Drama, Sci-Fi"
        }
    ];

    // Auto-rotate every 5 seconds
    React.useEffect(() => {
        if (isHovered || loading || trendingContent.length === 0) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % trendingContent.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [isHovered, loading, trendingContent]);

    const currentContent = trendingContent[currentIndex];

    const handlePlayClick = () => {
        if (!currentContent) return;
        console.log(`Playing ${currentContent.title}`);
        console.log('Content data:', currentContent);
        
        // Navigate directly to detail page if IMDb ID is available
        if (currentContent.imdbId) {
            const contentType = currentContent.type === 'Movie' ? 'movie' : 'series';
            console.log(`Navigating to: #/detail/${contentType}/${currentContent.imdbId}/${currentContent.imdbId}`);
            window.location.hash = `#/detail/${contentType}/${currentContent.imdbId}/${currentContent.imdbId}`;
        } else {
            // Fallback alert if no IMDb ID
            alert(`${currentContent.type}: ${currentContent.title}\n\nRating: ⭐ ${currentContent.rating}/10\nYear: ${currentContent.year}\nGenre: ${currentContent.genre}\n\nDescription: ${currentContent.description}\n\nNote: IMDb ID not available for this item.`);
        }
    };

    const handleDotClick = (index) => {
        if (index === currentIndex || trendingContent.length === 0) return;
        setCurrentIndex(index);
    };

    const handleImageLoad = () => {
        console.log(`Image loaded successfully for: ${currentContent?.title}`);
        setImageLoaded(true);
        setImageError(false);
    };

    const handleImageError = (e) => {
        console.log(`Image failed to load for: ${currentContent?.title}, using fallback`);
        setImageError(true);
        // Use a fallback image
        e.target.src = 'https://images.unsplash.com/photo-1489599835387-957764d17ead?w=800&h=1200&fit=crop&crop=center&auto=format&q=80';
    };

    // Show loading state
    if (loading) {
        return (
            <motion.div 
                className={styles['trending-slideshow-container']}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <div className={styles['slideshow-header']}>
                    <h2 className={styles['trending-title']}>�� Trending Now</h2>
                </div>
                <div className={styles['slideshow-content']}>
                    <div className={styles['poster-section']}>
                        <div className={styles['poster-loading']}>
                            <div className={styles['loading-spinner']}></div>
                            <div className={styles['loading-text']}>Loading trending content...</div>
                        </div>
                    </div>
                    <div className={styles['content-details']}>
                        <div className={styles['content-header']}>
                            <h1 className={styles['content-title']}>Loading...</h1>
                        </div>
                        <div className={styles['content-description']}>
                            Please wait while we fetch the latest trending content from TMDB...
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Show error state if no content
    if (!currentContent || trendingContent.length === 0) {
        return (
            <motion.div 
                className={styles['trending-slideshow-container']}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <div className={styles['slideshow-header']}>
                    <h2 className={styles['trending-title']}>🔥 Trending Now</h2>
                </div>
                <div className={styles['slideshow-content']}>
                    <div className={styles['content-details']}>
                        <div className={styles['content-header']}>
                            <h1 className={styles['content-title']}>Unable to Load Content</h1>
                        </div>
                        <div className={styles['content-description']}>
                            We're having trouble loading trending content. Please try again later.
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div 
                key={currentContent.id}
                className={styles['trending-slideshow-container']}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                onMouseEnter={() => setIsHovered(false)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <motion.div 
                    className={styles['slideshow-header']}
                    variants={cardVariants}
                >
                    <h2 className={styles['trending-title']}>🔥 Trending Now</h2>
                </motion.div>

                <div className={styles['slideshow-content']}>
                    <motion.div 
                        className={styles['poster-section']}
                        variants={posterVariants}
                    >
                        <motion.div 
                            className={styles['poster-image']}
                            whileHover={{ 
                                scale: 1.05,
                                rotateY: 5,
                                transition: { duration: 0.3 }
                            }}
                            onHoverStart={() => setIsHovered(true)}
                            onHoverEnd={() => setIsHovered(false)}
                        >
                            {!imageLoaded && !imageError && (
                                <div className={styles['poster-loading']}>
                                    <div className={styles['loading-spinner']}></div>
                                    <div className={styles['loading-text']}>Loading...</div>
                                </div>
                            )}
                            <img 
                                src={currentContent.poster} 
                                alt={currentContent.title}
                                className={styles['poster']}
                                onLoad={handleImageLoad}
                                onError={handleImageError}
                                style={{ 
                                    opacity: imageLoaded ? 1 : 0,
                                    display: imageLoaded ? 'block' : 'none'
                                }}
                            />
                            <motion.div 
                                className={styles['poster-overlay']}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: isHovered ? 1 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className={styles['content-info']}>
                                    <div className={styles['rating']}>
                                        ⭐ {currentContent.rating}
                                    </div>
                                    <div className={styles['year']}>
                                        {currentContent.year}
                                    </div>
                                    <div className={styles['genre']}>
                                        {currentContent.genre}
                                    </div>
                                </div>
                                
                                <motion.div 
                                    className={styles['play-button-container']}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                >
                                    <motion.button 
                                        className={styles['play-button']}
                                        onClick={handlePlayClick}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <div className={styles['play-icon']}>▶</div>
                                        <span>Play Now</span>
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                        
                        {/* Remove the old play button container that was outside */}
                    </motion.div>

                    <motion.div 
                        className={styles['content-details']}
                        variants={contentVariants}
                    >
                        <div className={styles['content-header']}>
                            <h1 className={styles['content-title']}>
                                {currentContent.title}
                            </h1>
                            <div className={styles['content-meta']}>
                                <span className={styles['content-type']}>
                                    {currentContent.type === 'Movie' ? '🎬 Movie' : '📺 TV Show'}
                                </span>
                                <span className={styles['content-rating']}>
                                    ⭐ {currentContent.rating}/10
                                </span>
                            </div>
                        </div>
                        
                        <div className={styles['content-description']}>
                            {currentContent.description}
                        </div>
                        
                        <motion.div 
                            className={styles['content-stats']}
                            variants={statsVariants}
                        >
                            <motion.div 
                                className={styles['stat-item']}
                                whileHover={{ y: -3, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className={styles['stat-label']}>Year:</span>
                                <span className={styles['stat-value']}>{currentContent.year}</span>
                            </motion.div>
                            <motion.div 
                                className={styles['stat-item']}
                                whileHover={{ y: -3, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className={styles['stat-label']}>Genre:</span>
                                <span className={styles['stat-value']}>{currentContent.genre}</span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>

                <motion.div 
                    className={styles['slideshow-indicators']}
                    variants={indicatorsVariants}
                >
                    {trendingContent.map((_, index) => (
                        <motion.button
                            key={index}
                            className={classnames(
                                styles['indicator-dot'],
                                { [styles['active']]: index === currentIndex }
                            )}
                            onClick={() => handleDotClick(index)}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                        />
                    ))}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

module.exports = TrendingSlideshow;
