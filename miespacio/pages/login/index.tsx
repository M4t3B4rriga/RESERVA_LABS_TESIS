import { useEffect, useState } from 'react';
import { TimelineLite, Power2 } from 'gsap';
import { useRouter } from "next/router";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/Login.module.css'
import axios from "axios";
import { API_BASE_URL } from '@/src/components/BaseURL';
import Layout from '@/src/components/Layout';
import { jwtVerify } from 'jose';
import { GetServerSidePropsContext } from 'next';
import { Auth } from '@/libs/auth';
import Head from 'next/head';

interface Props {
  usuarioLogueado: Auth | null;
}

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
          return { props: { usuarioLogueado: null } };
      }
      return { props: { usuarioLogueado: usuarioLogueado } };
  } catch (error) {
      console.error(error);
      return { props: { usuarioLogueado: null } };
  }
}

export default function Login({usuarioLogueado}: Props): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
      console.log(res);

      if (res.status === 200) {
        router.push("/");
      }
    } catch (error) {
      setErrorMessage("Credenciales inválidas. Por favor, verifique su usuario y contraseña."); // Establecer el mensaje de error en caso de fallo de inicio de sesión
    }
    setIsLoading(false);
  };
  useEffect(() => {

    const timeline = new TimelineLite({ repeat: -1, yoyo: true });
    timeline
      .to('#leaf1', 10, { attr: { d: 'M118.119 603.823C-5.67286 471.833 23.2981 362.999 141.389 270.418C510.905 -19.2759 933.474 -134.125 1224.81 220.707C1324.99 342.726 1050.61 516.81 1101.01 642.392C1180.13 839.521 984.666 878.946 848.774 870.376C712.881 861.805 754.766 1062.36 613.289 1101.79C471.812 1141.21 184.247 983.5 158.142 896.088C127.427 793.238 255.109 749.885 118.119 603.823Z' }, ease: Power2.easeInOut }, 0)
      .to('#leaf2', 15, { attr: { d: 'M990.579 1115.03C1514.24 1060.98 1976.05 1089.34 1949.94 793.025C1898.38 207.696 1289.86 580.638 1055.84 0L289.468 69.3683C152.416 80.5015 69.4384 225.233 97.4082 345.985C129.342 483.849 289.468 554.946 165.468 780.179C17.8029 1048.4 310.476 1276.72 523.482 1132.16C794.79 948.033 824.624 1132.16 990.579 1115.03Z' }, ease: Power2.easeInOut }, 0)
      .to('#leaf3', 19, { attr: { d: 'M406.687 1303.33C106.832 1277.09 -44.4578 875.887 11.4694 613.768L88.8352 104.09L682.594 65.5432L1428.29 21C1554.44 36.4188 2332.02 28.9856 2136.7 385.912C1893.42 830.487 2200.08 935.849 1706.99 1122.59C1305.15 1274.77 1197.31 1101.36 1019.09 1062.63C743.182 1002.66 602.432 1320.46 406.687 1303.33Z' }, ease: Power2.easeInOut }, 0);


  }, []);

  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Layout hideNavbar={true} usuarioLogueado={usuarioLogueado}>
      <Head>
        <title>Login</title>
      </Head>
      <div>
        <div className={styles.svg_background}>
          <svg width="100%" height="100%" viewBox="100 400 1900 900" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path id="leaf3" d="M278.28 1198.22C143.135 1021.58 258.707 778.064 49 572.275L63.9124 200.833L683.714 64.6632L1429.34 20.0757C1555.47 35.5098 2210.38 -124.834 2103.2 262.735C1976.54 720.715 1863.67 916.971 1461.96 1021.58C1388.01 1040.84 1205.65 1119.33 1042.55 1198.22C720.513 1353.97 378.623 1329.36 278.28 1198.22Z" fill="#1C6758" />
            <path id="leaf3_2" className={styles.hidden} d="M406.687 1303.33C106.832 1277.09 -44.4578 875.887 11.4694 613.768L88.8352 104.09L682.594 65.5432L1428.29 21C1554.44 36.4188 2332.02 28.9856 2136.7 385.912C1893.42 830.487 2200.08 935.849 1706.99 1122.59C1305.15 1274.77 1197.31 1101.36 1019.09 1062.63C743.182 1002.66 602.432 1320.46 406.687 1303.33Z" fill="#1C6758" />
          </svg>
        </div>
        <div className={styles.svg_background}>
          <svg width="100%" height="100%" viewBox="0 300 1900 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path id="leaf2_2" className={styles.hidden} d="M990.579 1115.03C1514.24 1060.98 1976.05 1089.34 1949.94 793.025C1898.38 207.696 1289.86 580.638 1055.84 0L289.468 69.3683C152.416 80.5015 69.4384 225.233 97.4082 345.985C129.342 483.849 289.468 554.946 165.468 780.179C17.8029 1048.4 310.476 1276.72 523.482 1132.16C794.79 948.033 824.624 1132.16 990.579 1115.03Z" fill="#3D8361" fillOpacity="0.8" />
            <path id="leaf2" d="M1017.75 1030.15C1522.84 892.874 1980.4 1157.74 1835.96 743.283C1654.79 223.459 1256.32 459.842 1056.89 0L290.872 69.3617C153.883 80.4938 -25.0417 227.78 2.91533 348.521C34.8341 486.371 147.36 495.642 123.13 795.353C98.9008 1095.06 371.947 1329.86 573.237 1170.59C774.527 1011.31 753.094 1102.08 1017.75 1030.15Z" fill="#3D8361" fillOpacity="0.8" />
          </svg>
        </div>
        <div className={styles.svg_background}>
          <svg width="100%" height="100%" viewBox="-400 300 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path id="leaf1" d="M113.378 652.254C-50.5519 619.259 -24.472 423.351 113.378 314.568C422.609 70.54 1175.2 133.265 1203.14 157.324C1231.08 181.384 1096.96 474.389 1134.21 604.136C1162.83 703.809 1005.68 763.957 869.69 755.365C733.702 746.772 783.999 997.674 642.423 1037.2C500.848 1076.73 165.537 975.333 191.617 887.69C217.697 800.046 318.29 693.498 113.378 652.254Z" fill="#7AA874" fillOpacity="0.7" />
            <path id="leaf1_2" className={styles.hidden} d="M118.119 603.823C-5.67286 471.833 23.2981 362.999 141.389 270.418C510.905 -19.2759 933.474 -134.125 1224.81 220.707C1324.99 342.726 1050.61 516.81 1101.01 642.392C1180.13 839.521 984.666 878.946 848.774 870.376C712.881 861.805 754.766 1062.36 613.289 1101.79C471.812 1141.21 184.247 983.5 158.142 896.088C127.427 793.238 255.109 749.885 118.119 603.823Z" fill="#7AA874" fillOpacity="0.7" />
          </svg>
        </div>
        <div className={styles.login_background}></div>
        <div className={styles.loginContainer}>
          <div className={styles.logoContainer}>
            <img src="/images/logos/mi_espacio.png" alt="Logo" className={styles.logo} />
          </div>
          <div className={styles.formContainer}>
            <h2 className={styles.loginTitle}>Iniciar Sesión</h2>
            <img src={"/images/logos/logo_espe.png"} alt="User Icon" className={styles.userIcon} />
            <form className={styles.form} onSubmit={handleSubmit}>
              <label htmlFor="username" className={styles.label}>Usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Ingresa tu usuario de miESPE"
                required
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    username: e.target.value,
                  })
                }
                className={styles.input} />
              <label htmlFor="password" className={styles.label}>Contraseña</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  id="password"
                  name="password"
                  placeholder="Ingresa tu contraseña de miESPE"
                  required
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      password: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '36%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  onClick={toggleShowPassword}
                >
                  <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className={styles.show_button} />
                </button>
              </div>
              {errorMessage && <label className={styles.labelError}>{errorMessage}</label>}
              <button type="submit" className={styles.button} disabled={isLoading}>
                {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}