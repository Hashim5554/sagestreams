const React = require('react');
const { useState, useEffect, useRef } = React;
const { motion, AnimatePresence } = require('framer-motion');
const styles = require('./styles.less');

const VerticalMovieRow = ({ title, items = [], itemComponent: ItemComponent }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef(null);
    const intervalRef = useRef(null);

    // Auto-advance to next item every 4 seconds
    useEffect(() => {
        if (!isHovering && items.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % items.length);
            }, 4000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isHovering, items.length]);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    const handleDotClick = (index) => {
        setCurrentIndex(index);
    };

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div 
            className={styles['vertical-movie-row']}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div className={styles['row-header']}>
                <h2 className={styles['row-title']}>{title}</h2>
                <div className={styles['navigation-controls']}>
                    <button 
                        className={styles['nav-button']} 
                        onClick={handlePrevious}
                        disabled={items.length <= 1}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M8 15L13 10L8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button 
                        className={styles['nav-button']} 
                        onClick={handleNext}
                        disabled={items.length <= 1}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M16 9L11 14L16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div className={styles['content-container']} ref={containerRef}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        className={styles['current-item']}
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.95 }}
                        transition={{ 
                            duration: 0.6, 
                            ease: [0.4, 0, 0.2, 1],
                            scale: { duration: 0.4 }
                        }}
                    >
                        {React.createElement(ItemComponent, {
                            ...items[currentIndex],
                            className: styles['vertical-item']
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {items.length > 1 && (
                <div className={styles['indicators']}>
                    {items.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles['indicator-dot']} ${index === currentIndex ? styles['active'] : ''}`}
                            onClick={() => handleDotClick(index)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

module.exports = VerticalMovieRow;
