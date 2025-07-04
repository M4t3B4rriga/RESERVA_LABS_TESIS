import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import styles from '@/styles/Layout.module.css';
import { Auth } from '@/libs/auth';

interface LayoutProps {
    children: ReactNode;
    hideNavbar?: boolean;
    usuarioLogueado: Auth | null;
}

const Layout: React.FC<LayoutProps> = ({ children, hideNavbar = false, usuarioLogueado }) => {
    return (
        <>
            <div className={styles.row}>
                {!hideNavbar && <Navbar usuarioLogueado={usuarioLogueado}/>}
                <main>{children}</main>
            </div>
        </>
    );
};

export default Layout;