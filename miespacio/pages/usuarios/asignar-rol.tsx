import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { PersonaInternaUsuario } from '@/libs/persona';
import { Roles } from '@/libs/roles';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/AsignarRol.module.css';
import { API_BASE_URL } from '@/src/components/BaseURL';
import { ReactNotifications } from 'react-notifications-component'
import 'react-notifications-component/dist/theme.css'
import { Store } from 'react-notifications-component';
import { parseCookies } from 'nookies';
import Cookies from 'js-cookie';
import { insertAuditLog } from '@/src/components/Auditoria';
import Select from 'react-select';
import { Auth } from '@/libs/auth';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import Head from 'next/head';
import Layout from '@/src/components/Layout';

const PAGE_SIZE = 10;
type OrderBy = 'PEI_NOMBRE' | 'PEI_APELLIDO_PATERNO' | 'PEI_CARNET_ID' | 'PEI_EMAIL_INSTITUCIONAL' | 'PEI_EMAIL_PERSONAL' | 'PEI_CEDULA' | 'PEI_TELEFONO' | 'UNI_SIGLAS';
type OrderDir = 'ASC' | 'DESC';

export async function getServerSideProps(context: GetServerSidePropsContext) {
    try {

        const { miEspacioSession } = context.req.cookies;

        if (miEspacioSession === undefined) {
            console.log('No hay cookie');
            return { props: { reservas: [], totalCount: 0, usuarioLogueado: null } };
        }

        const { payload } = await jwtVerify(
            miEspacioSession,
            new TextEncoder().encode('secret')
        );

        console.log(payload);

        const CodPersonaInterna = payload?.PI;
        const NombreUsuario = payload?.Nombre + ' ' + payload?.ApellPaterno;
        const CodRol = payload?.CodRol;
        const CodUsuario = payload?.CodUsuario;

        const usuarioLogueado = {
            CodPersonaInterna: CodPersonaInterna as number,
            usuarioNombre: NombreUsuario as string,
            CodRol: CodRol as number,
            usuarioLogueado: CodUsuario as number,
        } as Auth;

        if (CodPersonaInterna === undefined || NombreUsuario === undefined || CodRol === undefined || CodUsuario === undefined) {
            console.log('No hay payload');
            return { props: { roles: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/roles`, {
            params: { page: '1', limit: 99, filter: 'Estado-1', orderBy: 'ROL_NOMBRE', orderDir: 'ASC' },
        });
        if (response.status === 200) {
            const roles = response.data.roles;

            return { props: { roles, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { roles: [], error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }

    } catch (error) {
        console.error(error);
        return { props: { roles: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function AsignarRol({ roles: initialRoles, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { roles: Roles[], error?: boolean, messageError?: string, usuarioLogueado: Auth }) {
    const [usuariosSinRol, setUsuariosSinRol] = useState<PersonaInternaUsuario[]>([]);
    const [usuariosConRol, setUsuariosConRol] = useState<PersonaInternaUsuario[]>([]);
    const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(initialUsuarioLogueado);
    const [roles, setRoles] = useState<Roles[]>(initialRoles);
    const [selectedRol, setSelectedRol] = useState<any>();
    const [selectedUsuario, setSelectedUsuario] = useState<PersonaInternaUsuario | null>(null);
    const [selectedUsuarioConRol, setSelectedUsuarioConRol,] = useState<PersonaInternaUsuario | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalUsuarios, setTotalUsuarios] = useState();
    const [searchUsuariosSinRol, setSearchUsuariosSinRol] = useState('');
    const [searchUsuariosConRol, setSearchUsuariosConRol] = useState('');
    const [filters, setFilters] = useState([]);
    const [orderBy, setOrderBy] = useState<OrderBy>('PEI_APELLIDO_PATERNO');
    const [orderDir, setOrderDir] = useState<OrderDir>('ASC');
    const [cliente, setCliente] = useState('cliente');
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const modalPrintRef = useRef<HTMLDivElement>(null);
    const modalFilterRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [error, setError] = useState(initialError);
    const [messageError, setMessageError] = useState(initialMessageError);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {

        if (typeof window !== 'undefined') {
            const fetchData = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/usuarios/rol`, {
                        params: { page: 1, limit: 99, searchUsuariosSinRol, orderBy, orderDir },
                    });

                    if (response.status === 200) {
                        setUsuariosSinRol(response.data.usuarios);
                    } else {
                        console.error('La API no respondió con el estado 200 OK');
                        setError(true);
                        setMessageError(response.data.message);
                    }
                } catch (error) {
                    console.error(error);
                    setError(true);
                    setMessageError("Hubo un error al obtener la información");
                }
            };

            fetchData();
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (selectedRol) {
                fetchUsuariosRolData(selectedRol);
            }
        }
    }, [selectedRol]);

    const fetchUsuariosSinRolData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/usuarios/rol`, {
                params: { page: 1, limit: 99, search: searchUsuariosSinRol, orderBy, orderDir },
            });

            if (response.status === 200) {
                setUsuariosSinRol(response.data.usuarios);
            } else {
                console.error('La API no respondió con el estado 200 OK');
                setError(true);
                setMessageError(response.data.message);
            }
        } catch (error) {
            console.error(error);
            setError(true);
            setMessageError("Hubo un error al obtener la información");
        }
    };

    const fetchUsuariosRolData = async (selectedRol: any) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/usuarios/rol`, {
                params: { page: 1, limit: 99, search: searchUsuariosConRol, orderBy, orderDir, CodRol: selectedRol.value },
            });

            if (response.status === 200) {
                setUsuariosConRol(response.data.usuarios);
            } else {
                console.error('La API no respondió con el estado 200 OK');
                setError(true);
                setMessageError(response.data.message);
            }
        } catch (error) {
            console.error(error);
            setError(true);
            setMessageError("Hubo un error al obtener la información");
        }
    };

    function handleSearchSinRolTermChange(newSearchTerm: string) {
        setSearchUsuariosSinRol(newSearchTerm);
        setCurrentPage(1);
        fetchUsuariosSinRolData();
    };

    function handleSearchConRolTermChange(newSearchTerm: string) {
        setSearchUsuariosConRol(newSearchTerm);
        setCurrentPage(1);
        if (selectedRol) {
            fetchUsuariosRolData(selectedRol);
        }
    };

    const handleReload = () => {
        router.reload();
    };

    const handleSelectUsuario = (usuario: PersonaInternaUsuario) => {
        if (usuario) {
            setSelectedUsuario(usuario);
            setSelectedUsuarioConRol(null);
        }
    }

    const handleSelectUsuarioConRol = (usuario: PersonaInternaUsuario) => {
        if (usuario) {
            setSelectedUsuario(null);
            setSelectedUsuarioConRol(usuario);
        }
    }

    const handleAsignarUno = async () => {
        if (selectedUsuario && selectedRol) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/rol`, {
                    usuarios: selectedUsuario,
                    CodRol: selectedRol.value,
                });
                if (response.status === 200) {
                    fetchUsuariosRolData(selectedRol);
                    fetchUsuariosSinRolData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los roles",
                    message: "Estamos teniendo problemas, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true
                    }
                });
            }
        } else {
            Store.addNotification({
                title: "No ha seleccionado un rol o un usuario",
                message: "Por favor seleccione un rol y un usuario para asignar el rol.",
                type: "warning",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4500,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
    };

    const handleAsignarTodo = async () => {
        if (usuariosSinRol && selectedRol) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/rol`, {
                    usuarios: usuariosSinRol,
                    CodRol: selectedRol.value,
                });
                if (response.status === 200) {
                    fetchUsuariosRolData(selectedRol);
                    fetchUsuariosSinRolData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los roles",
                    message: "Estamos teniendo problemas, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true
                    }
                });
            }
        } else {
            Store.addNotification({
                title: "No ha seleccionado un rol o un usuario",
                message: "Por favor seleccione un rol y un usuario para asignar el rol.",
                type: "warning",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4500,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
    };

    const handleDesasignarUno = async () => {
        if (selectedUsuarioConRol && selectedRol) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/rol`, {
                    usuarios: selectedUsuarioConRol,
                    CodRol: '',
                });
                if (response.status === 200) {
                    fetchUsuariosRolData(selectedRol);
                    fetchUsuariosSinRolData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los roles",
                    message: "Estamos teniendo problemas, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true
                    }
                });
            }
        } else {
            Store.addNotification({
                title: "No ha seleccionado un rol o un usuario",
                message: "Por favor seleccione un rol y un usuario para asignar el rol.",
                type: "warning",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4500,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
    };

    const handleDesasignarTodo = async () => {
        if (usuariosConRol && selectedRol) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/rol`, {
                    usuarios: usuariosConRol,
                    CodRol: '',
                });
                if (response.status === 200) {
                    fetchUsuariosRolData(selectedRol);
                    fetchUsuariosSinRolData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los roles",
                    message: "Estamos teniendo problemas, por favor intente mas tarde.",
                    type: "danger",
                    insert: "top",
                    container: "top-left",
                    animationIn: ["animate__animated", "animate__fadeIn"],
                    animationOut: ["animate__animated", "animate__fadeOut"],
                    dismiss: {
                        duration: 4500,
                        onScreen: true
                    }
                });
            }
        } else {
            Store.addNotification({
                title: "No ha seleccionado un rol o un usuario",
                message: "Por favor seleccione un rol y un usuario para asignar el rol.",
                type: "warning",
                insert: "top",
                container: "top-left",
                animationIn: ["animate__animated", "animate__fadeIn"],
                animationOut: ["animate__animated", "animate__fadeOut"],
                dismiss: {
                    duration: 4500,
                    onScreen: true,
                    pauseOnHover: true
                }
            });
        }
    };

    const options = roles.map((rol) => ({ value: rol.CodRol, label: rol.NombreRol }));

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Usuarios - Asignar Roles</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Usuarios por Rol</h1>
                </div>
                <div className={styles.crud_body}>
                    {error ? (
                        <div className={styles.notfound}>
                            <div className={styles.notfound_icon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                            <div className={styles.notfound_text}>{messageError}</div>
                            <button type='button' onClick={handleReload} className={styles.crud_normal_button}>Volver a intentar</button>
                        </div>
                    ) : (
                        <>
                            <div className={styles.rol_options}>
                                <div className={styles.rol_label}>Rol</div>
                                <Select
                                    value={selectedRol} // El valor seleccionado se asigna a selectedRol
                                    options={options}
                                    onChange={(selectedOption: any) => setSelectedRol(selectedOption)} // El valor seleccionado se actualiza en setSelectedRol
                                    classNamePrefix="react-select-format"
                                    placeholder="Seleccione un rol"
                                    className={styles.select}
                                    isSearchable
                                />
                            </div>
                            <div className={styles.asignation_container}>
                                <div className={styles.column}>
                                    <div className={styles.column_header}>
                                        Usuarios Sin Asignar
                                    </div>
                                    <div className={styles.search_bar_container}>
                                        <SearchBar searchTerm={searchUsuariosSinRol} onSearchTermChange={handleSearchSinRolTermChange} />
                                    </div>
                                    <div className={styles.list_container}>
                                        {usuariosSinRol.map((usuario) => (
                                            <div key={usuario.CodPersonaInterna} className={`${styles.item_list} ${selectedUsuario?.CodPersonaInterna === usuario.CodPersonaInterna ? styles.selected : ''}`} onClick={() => handleSelectUsuario(usuario)}>
                                                <div className={styles.list_item_text}>{usuario.CarnetID} - {usuario.EmailInstitucional.split('@')[0]}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.column}>
                                    <div className={styles.column_header}>
                                        Operaciones
                                    </div>
                                    <div className={styles.buttons_container}>
                                        <button type='button' onClick={handleAsignarUno} className={styles.crud_normal_button}><FontAwesomeIcon icon={faAngleRight} /></button>
                                        <button type='button' onClick={handleAsignarTodo} className={styles.crud_normal_button}><FontAwesomeIcon icon={faAngleDoubleRight} /></button>
                                        <button type='button' onClick={handleDesasignarUno} className={styles.crud_normal_button}><FontAwesomeIcon icon={faAngleLeft} /></button>
                                        <button type='button' onClick={handleDesasignarTodo} className={styles.crud_normal_button}><FontAwesomeIcon icon={faAngleDoubleLeft} /></button>
                                    </div>
                                </div>
                                <div className={styles.column}>
                                    <div className={styles.column_header}>
                                        {selectedRol ? roles.find((rol: Roles) => selectedRol?.value === rol.CodRol)?.NombreRol : 'Usuarios Asignados'}
                                    </div>
                                    <div className={styles.search_bar_container}>
                                        <SearchBar searchTerm={searchUsuariosConRol} onSearchTermChange={handleSearchConRolTermChange} />
                                    </div>
                                    <div className={styles.list_container}>
                                        {usuariosConRol.map((usuario) => (
                                            <div key={usuario.CodPersonaInterna} className={`${styles.item_list} ${selectedUsuarioConRol?.CodPersonaInterna === usuario.CodPersonaInterna ? styles.selected : ''}`} onClick={() => handleSelectUsuarioConRol(usuario)}>
                                                <div className={styles.list_item_text}>{usuario.CarnetID} - {usuario.EmailInstitucional.split('@')[0]}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}