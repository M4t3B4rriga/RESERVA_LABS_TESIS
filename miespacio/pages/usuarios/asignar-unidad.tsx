import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { PersonaInterna } from '@/libs/persona';
import { Unidad } from '@/libs/unidad';
import SearchBar from '@/src/components/SearchBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleDoubleLeft, faAngleDoubleRight, faAngleLeft, faAngleRight, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/AsignarUnidad.module.css';
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
            return { props: { unidades: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
        }

        const response = await axios.get(`${API_BASE_URL}/api/unidad`, {
            params: { page: '1', limit: 99, filter: 'ESTADO-1', orderBy: 'UNI_NOMBRE', orderDir: 'ASC' },
        });
        if (response.status === 200) {
            const unidades = response.data.unidades;

            return { props: { unidades, usuarioLogueado: usuarioLogueado } };
        } else {
            console.error('La API no respondió con el estado 200 OK');
            return { props: { unidades: [], error: true, messageError: response.data.message, usuarioLogueado: usuarioLogueado } };
        }

    } catch (error) {
        console.error(error);
        return { props: { unidades: [], totalCount: 0, error: true, messageError: "Hubo un error al obtener la información", usuarioLogueado: null } };
    }
}

export default function AsignarUnidad({ unidades: initialUnidad, error: initialError, messageError: initialMessageError, usuarioLogueado: initialUsuarioLogueado }: { unidades: Unidad[], error?: boolean, messageError?: string, usuarioLogueado: Auth | null }) {
    const [usuariosSinUnidad, setUsuariosSinUnidad] = useState<PersonaInterna[]>([]);
    const [usuariosConUnidad, setUsuariosConUnidad] = useState<PersonaInterna[]>([]);
    const [usuarioLogueado, setUsuarioLogueado] = useState<Auth | null>(initialUsuarioLogueado);
    const [unidades, setUnidades] = useState<Unidad[]>(initialUnidad);
    const [selectedUnidad, setSelectedUnidad] = useState<any>();
    const [selectedUsuario, setSelectedUsuario] = useState<PersonaInterna | null>(null);
    const [selectedUsuarioConUnidad, setSelectedUsuarioConUnidad,] = useState<PersonaInterna | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [page, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalUsuarios, setTotalUsuarios] = useState();
    const [searchUsuariosSinUnidad, setSearchUsuariosSinUnidad] = useState('');
    const [searchUsuariosConUnidad, setSearchUsuariosConUnidad] = useState('');
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
                    const response = await axios.get(`${API_BASE_URL}/api/usuarios/unidad`, {
                        params: { page: 1, limit: 99, searchUsuariosSinUnidad, orderBy, orderDir },
                    });

                    if (response.status === 200) {
                        setUsuariosSinUnidad(response.data.usuarios);
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
            if (selectedUnidad) {
                fetchUsuariosUnidadData(selectedUnidad);
            }
        }
    }, [selectedUnidad]);

    const fetchUsuariosSinUnidadData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/usuarios/unidad`, {
                params: { page: 1, limit: 99, search: searchUsuariosSinUnidad, orderBy, orderDir },
            });

            if (response.status === 200) {
                setUsuariosSinUnidad(response.data.usuarios);
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

    const fetchUsuariosUnidadData = async (selectedUnidad: any) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/usuarios/unidad`, {
                params: { page: 1, limit: 99, search: searchUsuariosConUnidad, orderBy, orderDir, CodUnidad: selectedUnidad.value },
            });

            if (response.status === 200) {
                setUsuariosConUnidad(response.data.usuarios);
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

    function handleSearchSinUnidadTermChange(newSearchTerm: string) {
        setSearchUsuariosSinUnidad(newSearchTerm);
        setCurrentPage(1);
        fetchUsuariosSinUnidadData();
    };

    function handleSearchConUnidadTermChange(newSearchTerm: string) {
        setSearchUsuariosConUnidad(newSearchTerm);
        setCurrentPage(1);
        if (selectedUnidad) {
            fetchUsuariosUnidadData(selectedUnidad);
        }
    };

    const handleReload = () => {
        router.reload();
    };

    const handleSelectUsuario = (usuario: PersonaInterna) => {
        if (usuario) {
            setSelectedUsuario(usuario);
            setSelectedUsuarioConUnidad(null);
        }
    }

    const handleSelectUsuarioConUnidad = (usuario: PersonaInterna) => {
        if (usuario) {
            setSelectedUsuario(null);
            setSelectedUsuarioConUnidad(usuario);
        }
    }

    const handleAsignarUno = async () => {
        if (selectedUsuario && selectedUnidad) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/unidad`, {
                    usuarios: selectedUsuario,
                    CodUnidad: selectedUnidad.value,
                });
                if (response.status === 200) {
                    fetchUsuariosUnidadData(selectedUnidad);
                    fetchUsuariosSinUnidadData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los unidades",
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
        }
    };

    const handleAsignarTodo = async () => {
        if (usuariosSinUnidad && selectedUnidad) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/unidad`, {
                    usuarios: usuariosSinUnidad,
                    CodUnidad: selectedUnidad.value,
                });
                if (response.status === 200) {
                    fetchUsuariosUnidadData(selectedUnidad);
                    fetchUsuariosSinUnidadData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los unidades",
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
        }
    };

    const handleDesasignarUno = async () => {
        if (selectedUsuarioConUnidad && selectedUnidad) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/unidad`, {
                    usuarios: selectedUsuarioConUnidad,
                    CodUnidad: '',
                });
                if (response.status === 200) {
                    fetchUsuariosUnidadData(selectedUnidad);
                    fetchUsuariosSinUnidadData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los unidades",
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
        }
    };

    const handleDesasignarTodo = async () => {
        if (usuariosConUnidad && selectedUnidad) {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/usuarios/unidad`, {
                    usuarios: usuariosConUnidad,
                    CodUnidad: '',
                });
                if (response.status === 200) {
                    fetchUsuariosUnidadData(selectedUnidad);
                    fetchUsuariosSinUnidadData();
                    setSelectedUsuario(null);
                }
            } catch (error) {
                console.error(error);
                Store.addNotification({
                    title: "Ha ocurrido un problema asignar los unidades",
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
        }
    };

    const options = unidades.map((unidad) => ({ value: unidad.CodUnidad, label: unidad.Siglas + " - " + unidad.NombreUnidad }));

    return (
        <Layout usuarioLogueado={usuarioLogueado}>
            <Head>
                <title>Usuarios - Asignar Unidades</title>
            </Head>
            <div className={styles.crud_container}>
                <ReactNotifications />
                <div className={styles.crud_header}>
                    <h1>Usuarios por Unidad</h1>
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
                                <div className={styles.rol_label}>Unidad</div>
                                <Select
                                    value={selectedUnidad} // El valor seleccionado se asigna a selectedUnidad
                                    options={options}
                                    onChange={(selectedOption: any) => setSelectedUnidad(selectedOption)} // El valor seleccionado se actualiza en setSelectedUnidad
                                    classNamePrefix="react-select-format"
                                    placeholder="Seleccione una unidad"
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
                                        <SearchBar searchTerm={searchUsuariosSinUnidad} onSearchTermChange={handleSearchSinUnidadTermChange} />
                                    </div>
                                    <div className={styles.list_container}>
                                        {usuariosSinUnidad.map((usuario) => (
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
                                        {selectedUnidad ? unidades.find((unidad: Unidad) => selectedUnidad?.value === unidad.CodUnidad)?.Siglas : 'Usuarios Asignados'}
                                    </div>
                                    <div className={styles.search_bar_container}>
                                        <SearchBar searchTerm={searchUsuariosConUnidad} onSearchTermChange={handleSearchConUnidadTermChange} />
                                    </div>
                                    <div className={styles.list_container}>
                                        {usuariosConUnidad.map((usuario) => (
                                            <div key={usuario.CodPersonaInterna} className={`${styles.item_list} ${selectedUsuarioConUnidad?.CodPersonaInterna === usuario.CodPersonaInterna ? styles.selected : ''}`} onClick={() => handleSelectUsuarioConUnidad(usuario)}>
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