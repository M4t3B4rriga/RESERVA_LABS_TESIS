// components/Navbar.tsx
import React, { useEffect, useState } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faPlus, faSignOutAlt, faSun, faUserAlt } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Navbar.module.css';
import { GetServerSidePropsContext } from 'next';
import { jwtVerify } from 'jose';
import Cookies from 'js-cookie';
import axios from "axios";
import { API_BASE_URL } from './BaseURL';
import { Auth } from '@/libs/auth';
import { MenuItem } from '@/libs/MenuItem';
import { SubMenuItem } from '@/libs/SubMenuItem';
import { SubSubMenuItem } from '@/libs/SubSubMenuItem';
import { Accordion, AccordionDetails, AccordionSummary, Breadcrumbs, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Navbar = ({ usuarioLogueado }: { usuarioLogueado: Auth | null }) => {
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([]);
    const [subSubMenuItems, setSubSubMenuItems] = useState<SubSubMenuItem[]>([]);
    const [selectedMenu, setSelectedItems] = useState<MenuItem | null>(null);
    const [selectedSubMenu, setSelectedSubItems] = useState<SubMenuItem | null>(null);
    const [selectedSubSubMenu, setSelectedSubSubItems] = useState<SubSubMenuItem | null>(null);
    const [permisos, setPermisos] = useState<any[]>([]);
    const [theme, setTheme] = useState('light');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (usuarioLogueado === null) {
            router.push('/login');
        }
    }, [usuarioLogueado]);

    useEffect(() => {
        const hideMenu = () => {
            if (window.innerWidth < 768) {
                setIsNavVisible(false);
            } else {
                setIsNavVisible(true);
            }
        };

        if (window.innerWidth < 768) {
            setIsNavVisible(false);
        }

        window.addEventListener('resize', hideMenu);

        return () => window.removeEventListener('resize', hideMenu);
    }, []);

    useEffect(() => {
        const fetchItems = async () => {
            if (usuarioLogueado !== null) {
                try {
                    const responseItems = await axios.get(`${API_BASE_URL}/api/item`);
                    setMenuItems(responseItems.data.menuItems);
                    setSubMenuItems(responseItems.data.subMenuItems);
                    setSubSubMenuItems(responseItems.data.subSubMenuItems);

                    const response = await axios.get(`${API_BASE_URL}/api/permisos/${usuarioLogueado.CodRol}`);
                    const permissions = response.data.permisos;
                    setPermisos(permissions);
                } catch (error) {
                    console.error(error);
                }
            }
        };
        fetchItems();
    }, []);

    const handleToggleNav = () => {
        setIsNavVisible((prev) => !prev);
    };

    const handleLogout = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/logOut`);
            if (res.status === 200) {
                router.push("/login");
            }
        } catch (error) {
            console.error("Error al cerrar sesión");
        }
    };

    const filterItemsByPermissions = (items: MenuItem[]): MenuItem[] => {
        return items.filter(item => permisos.some(permission => permission.PK_TMS_ITEM_MENU === item.PK_TMS_ITEM_MENU));
    };

    const filterSubItemsByPermissions = (subItems: SubMenuItem[]): SubMenuItem[] => {
        return subItems.filter(subItem => permisos.some(permission => permission.PK_TMSSUBITEM_MENU === subItem.PK_TMSSUBITEM_MENU));
    };

    const filterSubSubItemsByPermissions = (subSubItems: SubSubMenuItem[]): SubSubMenuItem[] => {
        return subSubItems.filter(subSubItem => permisos.some(permission => permission.PK_TMSSUB_SUBITEM_MENU === subSubItem.PK_TMSSUB_SUBITEM_MENU));
    };

    const renderSubSubItems = (subMenuItem: SubMenuItem, menuItem: MenuItem) => {
        const filteredSubSubItems = filterSubSubItemsByPermissions(subSubMenuItems.filter(subSubItem => subSubItem.PK_TMSSUBITEM_MENU === subMenuItem.PK_TMSSUBITEM_MENU));

        if (filteredSubSubItems.length === 0) {
            return null;
        }

        return filteredSubSubItems.map(subSubMenuItem => (
            <li key={subSubMenuItem.PK_TMSSUB_SUBITEM_MENU}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Breadcrumbs aria-label="breadcrumb">
                        <Link href={menuItem.IME_URL + subMenuItem.SME_URL + subSubMenuItem.SSM_URL} passHref className={styles.link_text}>
                            <Typography component="a" color="inherit">
                                {subSubMenuItem.SSM_NOMBRE}
                            </Typography>
                        </Link>
                    </Breadcrumbs>
                </div>
            </li>
        ));
    };

    const renderSubMenuItems = (menuItem: MenuItem) => {
        const filteredSubMenuItems = filterSubItemsByPermissions(subMenuItems.filter(subMenuItem => subMenuItem.PK_TMS_ITEM_MENU === menuItem.PK_TMS_ITEM_MENU));

        if (filteredSubMenuItems.length === 0) {
            return null;
        }

        return filteredSubMenuItems.map(subMenuItem => {
            const filteredSubSubItems = filterSubSubItemsByPermissions(subSubMenuItems.filter(subSubItem => subSubItem.PK_TMSSUBITEM_MENU === subMenuItem.PK_TMSSUBITEM_MENU));

            return (
                <li key={subMenuItem.PK_TMSSUBITEM_MENU}>
                    <Accordion>
                        <AccordionSummary expandIcon={filteredSubSubItems.length > 0 ? <ExpandMoreIcon /> : null}>
                            <Link href={menuItem.IME_URL + subMenuItem.SME_URL} passHref className={styles.link_text}>
                                <Typography component="a" color="inherit">
                                    {subMenuItem.SME_NOMBRE}
                                </Typography>
                            </Link>
                        </AccordionSummary>
                        {filteredSubSubItems.length > 0 ? (
                            <AccordionDetails>
                                <ul>{renderSubSubItems(subMenuItem, menuItem)}</ul>
                            </AccordionDetails>
                        ) : null}
                    </Accordion>
                </li>
            );
        });
    };

    const renderItems = () => {
        const filteredMenuItems = filterItemsByPermissions(menuItems);

        if (filteredMenuItems.length === 0) {
            return null;
        }

        return filteredMenuItems.map(menuItem => {
            const filteredSubMenuItems = filterSubItemsByPermissions(subMenuItems.filter(subMenuItem => subMenuItem.PK_TMS_ITEM_MENU === menuItem.PK_TMS_ITEM_MENU));

            return (
                <li key={menuItem.PK_TMS_ITEM_MENU}>
                    <Accordion>
                        <AccordionSummary expandIcon={filteredSubMenuItems.length > 0 ? <ExpandMoreIcon /> : null}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Link href={menuItem.IME_URL} passHref>
                                    <Typography component="a">
                                        {menuItem.IME_NOMBRE}
                                    </Typography>
                                </Link>
                            </div>
                        </AccordionSummary>
                        {filteredSubMenuItems.length > 0 ? (
                            <AccordionDetails>
                                <ul>{renderSubMenuItems(menuItem)}</ul>
                            </AccordionDetails>
                        ) : null}
                    </Accordion>
                </li>
            );
        });
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            setIsDarkMode(true);
        } else {
            setIsDarkMode(false);
        }
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme); // Opcional: guardar el tema en el localStorage para recordar la selección del usuario
    };

    useEffect(() => {
        // Verificar el tema almacenado en localStorage al cargar la aplicación
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            if (storedTheme === 'dark') {
                setIsDarkMode(true);
            }
            setTheme(storedTheme);
            document.documentElement.setAttribute('data-theme', storedTheme);
        }
    }, []);

    return (
        <>
            <nav className={`${styles.navbar} ${isNavVisible ? styles.visible : styles.hidden}`}>
                <div>
                    <button className={styles.logo_button} onClick={handleToggleNav}>
                        <div>
                            <img src="/images/logos/logo_comprimido.png" alt="Logo" className={styles.logo} />
                        </div>
                        <div className={styles.logoContainer}>
                            <img src="/images/logos/mi_espacio.png" alt="Logo" className={styles.logo} />
                        </div>
                    </button>
                    <ul className={styles.navItems}>
                        {renderItems()}
                        <li key={'about'}>
                            <Accordion>
                                <AccordionSummary>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <Link href={'/about'} passHref>
                                            <Typography >
                                                Acerca de
                                            </Typography>
                                        </Link>
                                    </div>
                                </AccordionSummary>
                            </Accordion>
                        </li>
                    </ul>
                </div>
                <div className={styles.logout_container}>
                    <div className={styles.user_icon}>
                        <FontAwesomeIcon icon={faUserAlt} />
                    </div>
                    <div className={styles.info}>
                        <div>{usuarioLogueado?.usuarioNombre}</div>
                        <div className={styles.row}>
                            <FontAwesomeIcon icon={faSun} />
                            <label className={styles.switch}>
                                <input type="checkbox" checked={isDarkMode} onChange={toggleTheme} />
                                <span className={styles.slider}></span>
                            </label>
                            <FontAwesomeIcon icon={faMoon} />
                        </div>
                    </div>
                    <div className={styles.logout} title='Cerrar Sesión' onClick={handleLogout}>
                        <FontAwesomeIcon icon={faSignOutAlt} />
                    </div>
                </div>
            </nav>
            {!isNavVisible && (
                <button className={styles.toggleButton} onClick={handleToggleNav}>
                    &#9776;
                </button>
            )}
        </>

    );
};

export default Navbar;