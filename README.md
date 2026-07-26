# Planeador de Ciclos Escolares y PDAs - JOKARHE CORE

Este es un sistema web autónomo desarrollado en PHP y SQLite que permite almacenar información académica, calcular la programación de las sesiones escolares de una asignatura a lo largo del año, dividir el ciclo escolar en 3 periodos y distribuir de manera equitativa los Procesos de Desarrollo de Aprendizaje (PDA) mostrando sus fechas exactas de cobertura.

## Características

- **Gestión de Ciclos Escolares:** Configura la fecha de inicio del ciclo escolar, la cantidad de días hábiles totales (ej. 190 días) y la división en los 3 periodos.
- **Calendario Excluyente:** Permite registrar días festivos (días inhábiles) de forma manual o cargando automáticamente los días inhábiles oficiales de México para excluirlos de la programación de sesiones.
- **Gestión de Horarios Semanales:** Indica cuántas horas semanales se imparte una materia (de 1 a 8 horas) y distribuye estas horas en los días de la semana (Lunes a Viernes).
- **Cálculo Automático de Sesiones:** El sistema calcula el número exacto de sesiones que tendrá la asignatura a lo largo de los días de clases hábiles del ciclo.
- **Distribución Equitativa de PDAs:** Con base en el número total de PDAs de la asignatura, el sistema distribuye las sesiones equitativamente, indicando qué fecha de inicio, qué fecha de fin y en qué periodo académico se desarrollará cada PDA.
- **Personalización de Temas:** Permite redactar y guardar temas personalizados para cada PDA directamente en la base de datos SQLite.
- **Diseño Premium:** Interfaz oscura, limpia, y modular (AULA UX) con bordes redondeados y sidebar colapsable compatible con macOS.

## Requisitos

- **PHP 8.0** o superior con la extensión `pdo_sqlite` habilitada.
- **SQLite 3**.

## Ejecución Local

Para correr el proyecto localmente, abre una terminal en el directorio del proyecto y ejecuta el servidor de desarrollo integrado de PHP:

```bash
php -S localhost:8000
```

Luego, abre tu navegador y entra en la siguiente dirección:

```
http://localhost:8000
```
