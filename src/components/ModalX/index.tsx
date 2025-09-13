import React from 'react';
import classnames from 'classnames';
import styles from './styles.less';

type ModalXProps = {
    isOpen: boolean;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    onClose: () => void;
    size?: 'md' | 'lg' | 'xl';
    children?: React.ReactNode;
    headerExtras?: React.ReactNode;
    className?: string;
};

const ModalX: React.FC<ModalXProps> = ({ isOpen, title, subtitle, onClose, size = 'xl', children, headerExtras, className }) => {
    React.useEffect(() => {
        if (!isOpen) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles['mx-root']} role="dialog" aria-modal="true">
            <div className={styles['mx-backdrop']} onClick={onClose} />
            <div className={classnames(styles['mx-dialog'], styles[`mx-${size}`], className)}>
                <div className={styles['mx-header']}>
                    <div className={styles['mx-titles']}>
                        {title ? <div className={styles['mx-title']}>{title}</div> : null}
                        {subtitle ? <div className={styles['mx-subtitle']}>{subtitle}</div> : null}
                    </div>
                    <div className={styles['mx-actions']}>
                        {headerExtras}
                        <button className={styles['mx-close']} onClick={onClose} aria-label="Close">✕</button>
                    </div>
                </div>
                <div className={styles['mx-body']}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ModalX;


