const React = require('react');
const { useState, useEffect, useRef } = React;
const { motion, AnimatePresence } = require('framer-motion');
const styles = require('./styles.less');

const VerticalMovieRow = ({ title, items = [], itemComponent: ItemComponent }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const intervalRef = useRef(null);

    // Auto-advance to next item faster (~1.6s)
    useEffect(() => {
        if (!isHovering && items.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % items.length);
            }, 1600);
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
        >
            <div className={styles['row-header']}>
                <h2 className={styles['row-title']}>{title}</h2>
                <div className={styles['navigation-controls']}>
                    <button 
                        className={styles['nav-button']} 
                        onClick={handlePrevious}
                        disabled={items.length <= 1}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M8 15L13 10L8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button 
                        className={styles['nav-button']} 
                        onClick={handleNext}
                        disabled={items.length <= 1}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M16 9L11 14L16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div className={styles['stacked-container']}>
                {items.map((item, index) => {
                    const isCurrent = index === currentIndex;
                    const isNext = index === (currentIndex + 1) % items.length;
                    const isNext2 = index === (currentIndex + 2) % items.length;
                    const isPrev = index === (currentIndex - 1 + items.length) % items.length;
                    const isPrev2 = index === (currentIndex - 2 + items.length) % items.length;
                    
                    return (
                        <motion.div
                            key={index}
                            className={`${styles['stacked-item']} ${isCurrent ? styles['current'] : ''} ${isNext ? styles['next'] : ''} ${isNext2 ? styles['next2'] : ''} ${isPrev ? styles['prev'] : ''} ${isPrev2 ? styles['prev2'] : ''}`}
                            initial={false}
                            animate={{
                                zIndex: isCurrent ? 10 : isNext ? 5 : isNext2 ? 3 : isPrev ? 5 : isPrev2 ? 3 : 1,
                                scale: isCurrent ? 1 : isNext ? 0.85 : isNext2 ? 0.7 : isPrev ? 0.85 : isPrev2 ? 0.7 : 0.6,
                                x: isCurrent ? 0 : isNext ? 160 : isNext2 ? 280 : isPrev ? -160 : isPrev2 ? -280 : 0,
                                opacity: isCurrent ? 1 : isNext ? 0.7 : isNext2 ? 0.5 : isPrev ? 0.7 : isPrev2 ? 0.5 : 0.2,
                                rotateY: isCurrent ? 0 : isNext ? -15 : isNext2 ? -25 : isPrev ? 15 : isPrev2 ? 25 : 0,
                            }}
                            transition={{ 
                                type: 'spring',
                                stiffness: 420,
                                damping: 36,
                                mass: 0.6
                            }}
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                        >
                            {React.createElement(ItemComponent, {
                                ...item,
                                className: styles['stacked-meta-item']
                            })}
                        </motion.div>
                    );
                })}
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
