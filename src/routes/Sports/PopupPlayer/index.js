const React = require('react');
const styles = require('./styles');

const PopupPlayer = () => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const src = params.get('source');
    const title = params.get('title') || 'Live Stream';
    if (!src) {
        return <div className={styles['popup-container']}><div className={styles['message']}>No source</div></div>;
    }
    return (
        <div className={styles['popup-container']}>
            <div className={styles['header']}>
                <div className={styles['title']}>{decodeURIComponent(title)}</div>
                <div className={styles['badge']}>LIVE</div>
            </div>
            <iframe
                className={styles['frame']}
                src={decodeURIComponent(src)}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
            />
        </div>
    );
};

module.exports = () => React.createElement(PopupPlayer);


