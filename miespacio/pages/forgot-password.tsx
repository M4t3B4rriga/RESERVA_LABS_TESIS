import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/src/components/Layout';
import styles from '@/styles/Login.module.css';
import axios from 'axios';
import { API_BASE_URL } from '@/src/components/BaseURL';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Store } from 'react-notifications-component';
import 'react-notifications-component/dist/theme.css';

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    justificacion: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Validación básica
    if (!formData.username || !formData.email || !formData.justificacion) {
      setErrorMessage('Todos los campos son obligatorios');
      setIsLoading(false);
      return;
    }

    if (formData.justificacion.length < 10) {
      setErrorMessage('La justificación debe tener al menos 10 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/request-password-change`, formData);
      
      setSuccessMessage(response.data.message);
      Store.addNotification({
        title: 'Solicitud Enviada',
        message: response.data.message,
        type: 'success',
        insert: 'top',
        container: 'top-left',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000, onScreen: true },
      });

      // Limpiar el formulario
      setFormData({
        username: '',
        email: '',
        justificacion: ''
      });

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error al enviar la solicitud. Inténtelo de nuevo.';
      setErrorMessage(errorMsg);
      Store.addNotification({
        title: 'Error',
        message: errorMsg,
        type: 'danger',
        insert: 'top',
        container: 'top-left',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 5000, onScreen: true },
      });
    }
    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Layout hideNavbar={true} usuarioLogueado={null}>
      <Head>
        <title>Recuperar Contraseña - miESPE</title>
      </Head>
      <div className={styles.loginContainer}>
        <div className={styles.logoContainer}>
          <img src="/images/logos/mi_espacio.png" alt="Logo" className={styles.logo} />
        </div>
        <div className={styles.formContainer}>
          <h2 className={styles.loginTitle}>Recuperar Contraseña</h2>
          <img src="/images/logos/logo_espe.png" alt="User Icon" className={styles.userIcon} />
          
          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="username" className={styles.label}>Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Ingresa tu usuario de miESPE"
              required
              value={formData.username}
              onChange={handleChange}
              className={styles.input}
            />

            <label htmlFor="email" className={styles.label}>Correo Institucional</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Ingresa tu correo institucional"
              required
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
            />

            <label htmlFor="justificacion" className={styles.label}>Justificación</label>
            <textarea
              id="justificacion"
              name="justificacion"
              placeholder="Explica por qué necesitas cambiar tu contraseña (mínimo 10 caracteres)"
              required
              value={formData.justificacion}
              onChange={handleChange}
              className={styles.input}
              rows={4}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />

            {errorMessage && <label className={styles.labelError}>{errorMessage}</label>}
            {successMessage && <label className={styles.labelSuccess}>{successMessage}</label>}

            <button type="submit" className={styles.button} disabled={isLoading}>
              {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Enviar Solicitud'}
            </button>

            <button 
              type="button" 
              className={styles.button} 
              onClick={() => router.push('/login')}
              style={{ marginTop: '10px' }}
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Volver al Login
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
            <p>Tu solicitud será revisada por un administrador.</p>
            <p>Recibirás una respuesta en tu correo institucional.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}