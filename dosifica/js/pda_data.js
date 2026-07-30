'use strict';

/**
 * js/pda_data.js — Biblioteca de Disciplinas y PDAs de la NEM (Fase 6 - Secundaria)
 */
const NEM_PHASE6_LIBRARY = {
    "Español": {
        1: [
            "Lee fragmentos o textos narrativos de la literatura universal de su interés y comparte sus apreciaciones.",
            "Reconoce el valor de la diversidad lingüística de México y el mundo a partir de testimonios.",
            "Elabora textos informativos sobre temas de interés colectivo utilizando fuentes confiables.",
            "Analiza y valora los mensajes y la publicidad en medios de comunicación tradicionales y electrónicos.",
            "Reconoce la tradición oral y valora los mitos, leyendas y narraciones de su comunidad.",
            "Utiliza el diálogo y el debate académico para resolver controversias y argumentar posturas.",
            "Redacta cartas formales y solicitudes para resolver trámites cotidianos de la escuela o comunidad.",
            "Identifica y compara recursos literarios y figuras retóricas en poemas de diversas épocas."
        ],
        2: [
            "Analiza críticamente las representaciones de género y diversidad en las obras de teatro actuales.",
            "Produce textos informativos y de divulgación para exponer un tema de interés científico o cultural.",
            "Analiza críticamente textos periodísticos reflexionando sobre la veracidad de la información.",
            "Investiga la evolución histórica del idioma español y valora las variantes lingüísticas locales.",
            "Redacta crónicas y reportajes sobre problemáticas sociales relevantes en su localidad.",
            "Escribe textos poéticos inspirados en temas comunitarios empleando ritmo y métrica.",
            "Participa en mesas redondas y paneles de discusión argumentando sus puntos de vista.",
            "Reconoce la estructura del guion teatral y realiza una lectura dramatizada en grupo."
        ],
        3: [
            "Diseña y elabora campañas de difusión social acerca de problemáticas de salud o ecología.",
            "Escribe ensayos de opinión argumentados sobre el uso ético de la tecnología y redes sociales.",
            "Analiza novelas y cuentos contemporáneos discutiendo el contexto social del autor.",
            "Analiza y produce textos argumentativos de carácter científico, humanístico o literario.",
            "Elabora una antología de literatura indígena contemporánea valorando la pluriculturalidad.",
            "Organiza y participa en debates formales asumiendo posturas y roles de moderación.",
            "Crea guiones de radiodifusión o podcasts educativos sobre acontecimientos escolares.",
            "Investiga y expone sobre el impacto social de las vanguardias artísticas del siglo XX."
        ]
    },
    "Matemáticas": {
        1: [
          {
                    "contenido": "Expresión de fracciones como decimales y de decimales como fracciones.",
                    "pda_number": 1,
                    "topic": "Usa diversas estrategias al convertir números fraccionarios a decimales y viceversa.",
                    "temas": "Concepto de fracción\nConcepto de número decimal\nValor posicional de los números decimales\nFracciones propias, impropias y mixtas\nFracciones equivalentes\nSimplificación de fracciones\nConversión de fracciones a decimales\nConversión de decimales exactos a fracciones\nConversión de decimales periódicos a fracciones\nComparación de fracciones y decimales\nResolución de problemas con fracciones y decimales",
                    "sessions_count": 5,
                    "verbo_rector": "Usa",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Extensión de los números a positivos y negativos y su orden.",
                    "pda_number": 2,
                    "topic": "Reconoce la necesidad de los números negativos a partir de usar cantidades que tienen al cero como referencia.",
                    "temas": "El número cero como punto de referencia\nConcepto de números positivos y negativos\nRecta numérica con números enteros\nUbicación de números negativos en la recta numérica\nComparación de números enteros\nSituaciones cotidianas con números negativos\nTemperaturas sobre y bajo cero\nAlturas y profundidades respecto al nivel del mar\nGanancias y pérdidas\nInterpretación de números negativos en contextos reales",
                    "sessions_count": 5,
                    "verbo_rector": "Reconoce",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Extensión de los números a positivos y negativos y su orden.",
                    "pda_number": 3,
                    "topic": "Compara y ordena números con signo (enteros, fracciones y decimales) en la recta numérica y analiza en qué casos se cumple la propiedad de densidad.",
                    "temas": "Números con signo\nRecta numérica\nUbicación de números enteros, fracciones y decimales\nComparación de números con signo\nOrden de números con signo\nFracciones con signo\nDecimales con signo\nValor absoluto\nPropiedad de densidad de los números racionales\nIdentificación de números entre dos números dados\nRepresentación de números racionales en la recta numérica",
                    "sessions_count": 6,
                    "verbo_rector": "Compara",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Extensión del significado de las operaciones y sus relaciones inversas.",
                    "pda_number": 4,
                    "topic": "Reconoce el significado de las cuatro operaciones básicas y sus relaciones inversas al resolver problemas que impliquen el uso de números con signo.",
                    "temas": "Números con signo\nSuma de números con signo\nResta de números con signo\nMultiplicación de números con signo\nDivisión de números con signo\nReglas de los signos\nPropiedades de las operaciones básicas\nOperaciones inversas\nJerarquía de las operaciones\nResolución de problemas con números con signo",
                    "sessions_count": 5,
                    "verbo_rector": "Reconoce",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Extensión del significado de las operaciones y sus relaciones inversas.",
                    "pda_number": 5,
                    "topic": "Comprueba y argumenta si cada una de estas operaciones cumple las propiedades: conmutativa, asociativa y distributiva",
                    "temas": "Operaciones básicas\nPropiedad conmutativa\nPropiedad asociativa\nPropiedad distributiva\nIdentificación de propiedades en las operaciones\nOperaciones que cumplen y no cumplen las propiedades\nJustificación de propiedades mediante ejemplos\nResolución de problemas aplicando las propiedades",
                    "sessions_count": 8,
                    "verbo_rector": "Argumenta",
                    "complejidad": "Alta",
                    "rango_sugerido": "13 a 15 sesiones"
          },
          {
                    "contenido": "Extensión del significado de las operaciones y sus relaciones inversas.",
                    "pda_number": 6,
                    "topic": "Identifica y aplica la jerarquía de operaciones y símbolos de agrupación al realizar cálculos.",
                    "temas": "Operaciones básicas\nJerarquía de operaciones\nSímbolos de agrupación\nOrden de resolución de expresiones\nExpresiones numéricas\nCálculo con operaciones combinadas\nResolución de problemas con jerarquía de operaciones",
                    "sessions_count": 5,
                    "verbo_rector": "Identifica",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Regularidades y Patrones.",
                    "pda_number": 7,
                    "topic": "Representa algebraicamente una sucesión con progresión aritmética de figuras y números.",
                    "temas": "Sucesiones numéricas\nPatrones de figuras\nPatrones numéricos\nProgresión aritmética\nTérmino general de una sucesión\nExpresiones algebraicas\nRepresentación algebraica de sucesiones\nResolución de problemas con sucesiones aritméticas",
                    "sessions_count": 6,
                    "verbo_rector": "Representa",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Introducción al álgebra",
                    "pda_number": 8,
                    "topic": "Interpreta y plantea diversas situaciones del lenguaje común al lenguaje algebraico y viceversa.",
                    "temas": "Lenguaje común y lenguaje algebraico\nVariables y literales\nConstantes y coeficientes\nExpresiones algebraicas\nTraducción del lenguaje común al algebraico\nTraducción del lenguaje algebraico al común\nPlanteamiento de expresiones algebraicas\nResolución de problemas con expresiones algebraicas",
                    "sessions_count": 6,
                    "verbo_rector": "Interpreta",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Introducción al álgebra",
                    "pda_number": 9,
                    "topic": "Representa algebraica mente perímetros de figuras",
                    "temas": "Concepto de perímetro\nPerímetro de figuras geométricas\nVariables y literales\nExpresiones algebraicas\nRepresentación algebraica del perímetro\nSimplificación de expresiones algebraicas\nPerímetros con medidas desconocidas\nResolución de problemas de perímetros algebraicos",
                    "sessions_count": 6,
                    "verbo_rector": "Representa",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Ecuaciones lineales y cuadráticas.",
                    "pda_number": 10,
                    "topic": "Resuelve ecuaciones de la forma Ax=B, Ax+B=C, Ax+B=Cx+D con el uso de las propiedades de la igualdad.",
                    "temas": "Concepto de ecuación\nElementos de una ecuación\nPropiedades de la igualdad\nDespeje de la incógnita\nEcuaciones de la forma Ax=B\nEcuaciones de la forma Ax+B=C\nEcuaciones de la forma Ax+B=Cx+D\nComprobación de soluciones\nResolución de problemas con ecuaciones lineales",
                    "sessions_count": 6,
                    "verbo_rector": "Resuelve",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Ecuaciones lineales y cuadráticas.",
                    "pda_number": 11,
                    "topic": "Modela y resuelve problemas cuyo planteamiento es una ecuación lineal.",
                    "temas": "Problemas con ecuaciones lineales\nIdentificación de datos e incógnitas\nPlanteamiento de ecuaciones lineales\nResolución de ecuaciones lineales\nComprobación de resultados\nInterpretación de la solución\nModelación de situaciones cotidianas con ecuaciones lineales",
                    "sessions_count": 8,
                    "verbo_rector": "Modela",
                    "complejidad": "Alta",
                    "rango_sugerido": "13 a 15 sesiones"
          },
          {
                    "contenido": "Ecuaciones lineales y cuadráticas.",
                    "pda_number": 12,
                    "topic": "Resuelve problemas de porcentajes en diversas situaciones.",
                    "temas": "Concepto de porcentaje\nPorcentaje como fracción y decimal\nCálculo de porcentajes\nAumento porcentual\nDescuento porcentual\nPorcentaje de una cantidad\nCálculo del total a partir de un porcentaje\nResolución de problemas con porcentajes",
                    "sessions_count": 6,
                    "verbo_rector": "Resuelve",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Funciones",
                    "pda_number": 13,
                    "topic": "Relaciona e interpreta relaciones proporcional y no proporcional a partir de su representación tabular, gráfica y con diagramas.",
                    "temas": "Proporcionalidad\nRelaciones proporcionales\nRelaciones no proporcionales\nTablas de valores\nGráficas de relaciones\nDiagramas de relaciones\nConstante de proporcionalidad\nComparación de relaciones proporcionales y no proporcionales\nInterpretación de tablas, gráficas y diagramas\nResolución de problemas de proporcionalidad",
                    "sessions_count": 6,
                    "verbo_rector": "Relaciona",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Funciones",
                    "pda_number": 14,
                    "topic": "Modela y resuelve diversas situaciones a través de ecuaciones proporcionales con constante positiva y negativa.",
                    "temas": "Proporcionalidad directa\nConstante de proporcionalidad\nConstante positiva y negativa\nEcuaciones de proporcionalidad\nTablas y gráficas de relaciones proporcionales\nModelación de situaciones proporcionales\nResolución de problemas con ecuaciones proporcionales\nInterpretación de la constante de proporcionalidad",
                    "sessions_count": 8,
                    "verbo_rector": "Modela",
                    "complejidad": "Alta",
                    "rango_sugerido": "13 a 15 sesiones"
          },
          {
                    "contenido": "Rectas y ángulos",
                    "pda_number": 15,
                    "topic": "Explora las figuras básicas como rectas y ángulos y su notación.",
                    "temas": "Punto, recta, semirrecta y segmento\nNotación de figuras básicas\nConcepto de ángulo\nElementos de un ángulo\nNotación de ángulos\nClasificación de ángulos\nRectas paralelas y perpendiculares\nRelación entre rectas y ángulos",
                    "sessions_count": 5,
                    "verbo_rector": "Explora",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Rectas y ángulos",
                    "pda_number": 16,
                    "topic": "Encuentra y calcula los ángulos que se forman al intersecar dos segmentos.",
                    "temas": "Intersección de rectas y segmentos\nÁngulos opuestos por el vértice\nÁngulos adyacentes\nÁngulos suplementarios\nÁngulos complementarios\nCálculo de ángulos\nRelaciones entre ángulos\nResolución de problemas con ángulos",
                    "sessions_count": 6,
                    "verbo_rector": "Encuentra",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Construcción y propiedades de las figuras planas y cuerpos.",
                    "pda_number": 17,
                    "topic": "Utiliza la regla y el compás para trazar: punto medio, mediatriz de un segmento, segmentos y ángulos congruentes, bisectriz de un ángulo, rectas perpendiculares y rectas paralelas.",
                    "temas": "Uso de la regla y el compás\nPunto medio de un segmento\nMediatriz de un segmento\nSegmentos congruentes\nÁngulos congruentes\nBisectriz de un ángulo\nRectas perpendiculares\nRectas paralelas\nConstrucciones geométricas básicas\nTrazos geométricos con regla y compás",
                    "sessions_count": 6,
                    "verbo_rector": "Utiliza",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Construcción y propiedades de las figuras planas y cuerpos.",
                    "pda_number": 18,
                    "topic": "ldentifica y traza las rectas notables en triángulos y cuadriláteros.",
                    "temas": "Triángulos y cuadriláteros\nAlturas de un triángulo\nMedianas de un triángulo\nMediatrices de un triángulo\nBisectrices de un triángulo\nRectas notables en cuadriláteros\nTrazo de rectas notables\nConstrucciones geométricas con regla y compás",
                    "sessions_count": 5,
                    "verbo_rector": "Identifica",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Construcción y propiedades de las figuras planas y cuerpos.",
                    "pda_number": 19,
                    "topic": "Construye y clasifica triángulos Y cuadriláteros a partir del análisis de distinta información.",
                    "temas": "Elementos de los triángulos\nClasificación de triángulos\nElementos de los cuadriláteros\nClasificación de cuadriláteros\nPropiedades de triángulos y cuadriláteros\nConstrucción de triángulos\nConstrucción de cuadriláteros\nAnálisis de figuras geométricas",
                    "sessions_count": 6,
                    "verbo_rector": "Construye",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Circunferencia, círculo y esfera.",
                    "pda_number": 20,
                    "topic": "Identifica y traza las rectas notables en la circunferencia y las relaciones entre ellas.",
                    "temas": "Elementos de la circunferencia\nRadio y diámetro\nCuerda\nSecante\nTangente\nArco\nRelaciones entre radio, diámetro, cuerda, secante y tangente\nTrazo de elementos notables de la circunferencia\nConstrucciones geométricas con regla y compás",
                    "sessions_count": 5,
                    "verbo_rector": "Identifica",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Circunferencia, círculo y esfera.",
                    "pda_number": 21,
                    "topic": "Investiga figuras relacionadas con círculos y propiedades de los círculos.",
                    "temas": "Circunferencia y círculo\nElementos del círculo\nFiguras relacionadas con el círculo\nPosiciones de rectas y circunferencias\nÁngulos en la circunferencia\nPropiedades del círculo\nPropiedades de la circunferencia\nAplicaciones del círculo en situaciones cotidianas",
                    "sessions_count": 7,
                    "verbo_rector": "Investiga",
                    "complejidad": "Alta",
                    "rango_sugerido": "13 a 15 sesiones"
          },
          {
                    "contenido": "Circunferencia, círculo y esfera.",
                    "pda_number": 22,
                    "topic": "Construye circunferencias a partir de distinta información. Verifica los criterios de existencia y unicidad de estas figuras.",
                    "temas": "Circunferencia y círculo\nElementos de la circunferencia\nConstrucción de circunferencias\nUso de la regla y el compás\nCircunferencia por centro y radio\nCircunferencia por tres puntos\nCriterios de existencia de una circunferencia\nCriterio de unicidad de una circunferencia\nVerificación de construcciones geométricas",
                    "sessions_count": 6,
                    "verbo_rector": "Construye",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Medición y cálculo en diferentes contextos.",
                    "pda_number": 23,
                    "topic": "Introduce la idea de distancia entre dos puntos como la longitud del segmento que los une.",
                    "temas": "Punto y segmento\nDistancia entre dos puntos\nLongitud de un segmento\nMedición de segmentos\nComparación de distancias\nUnidades de longitud\nUso de la regla para medir segmentos\nResolución de problemas con distancias",
                    "sessions_count": 5,
                    "verbo_rector": "Introduce",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Medición y cálculo en diferentes contextos.",
                    "pda_number": 24,
                    "topic": "Encuentra la distancia de un punto a una recta y la distancia entre dos rectas paralelas.",
                    "temas": "Distancia de un punto a una recta\nPerpendicular a una recta\nDistancia entre rectas paralelas\nRectas paralelas\nSegmento perpendicular\nMedición de distancias\nUso de la regla y la escuadra\nResolución de problemas con distancias geométricas",
                    "sessions_count": 6,
                    "verbo_rector": "Encuentra",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Medición y cálculo en diferentes contextos.",
                    "pda_number": 25,
                    "topic": "Explora la desigualdad del triángulo.",
                    "temas": "Elementos del triángulo\nLongitud de los lados de un triángulo\nDesigualdad del triángulo\nCondiciones de existencia de un triángulo\nComparación de longitudes\nConstrucción de triángulos\nVerificación de la desigualdad del triángulo\nResolución de problemas con la desigualdad del triángulo",
                    "sessions_count": 5,
                    "verbo_rector": "Explora",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Medición y cálculo en diferentes contextos.",
                    "pda_number": 26,
                    "topic": "Obtiene y aplica fórmulas o usa otras estrategias para calcular el perímetro y el área de polígonos regulares e irregulares y del círculo.",
                    "temas": "Perímetro de polígonos\nÁrea de polígonos\nPolígonos regulares\nPolígonos irregulares\nPerímetro de la circunferencia\nÁrea del círculo\nFórmulas de perímetro y área\nDescomposición de figuras compuestas\nResolución de problemas de perímetro y área",
                    "sessions_count": 6,
                    "verbo_rector": "Obtiene",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Obtención y representación de información.",
                    "pda_number": 27,
                    "topic": "Usa tablas, gráficas de barras y circulares para el análisis de información.",
                    "temas": "Recolección de datos\nOrganización de datos en tablas\nFrecuencia de datos\nTablas de frecuencia\nGráfica de barras\nGráfica circular\nInterpretación de tablas\nInterpretación de gráficas\nComparación de datos\nAnálisis de información estadística",
                    "sessions_count": 6,
                    "verbo_rector": "Usa",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Interpretación de la información a través de medidas de tendencia central y de dispersión.",
                    "pda_number": 28,
                    "topic": "Determina e interpreta la frecuencia absoluta, la frecuencia relativa, la media, la mediana y la moda en un conjunto de datos.",
                    "temas": "Recolección y organización de datos\nTablas de frecuencia\nFrecuencia absoluta\nFrecuencia relativa\nMedia aritmética\nMediana\nModa\nInterpretación de medidas de tendencia central\nAnálisis e interpretación de datos",
                    "sessions_count": 6,
                    "verbo_rector": "Determina",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Interpretación de la información a través de medidas de tendencia central y de dispersión.",
                    "pda_number": 29,
                    "topic": "Usa e interpreta las medidas de tendencia central (moda, media aritmética y mediana) y el rango de un conjunto de datos, y justifica con base en ellas sus decisiones.",
                    "temas": "Organización de datos\nMedidas de tendencia central\nMedia aritmética\nMediana\nModa\nRango\nInterpretación de medidas de tendencia central\nComparación de conjuntos de datos\nToma de decisiones con datos\nJustificación de conclusiones con datos estadísticos",
                    "sessions_count": 8,
                    "verbo_rector": "Justifica",
                    "complejidad": "Alta",
                    "rango_sugerido": "13 a 15 sesiones"
          },
          {
                    "contenido": "Azar y probabilidad",
                    "pda_number": 30,
                    "topic": "Compara cualitativamente dos o más eventos a partir de sus resultados posibles, usa relaciones como: \"es más probable que...\", \"es menos probable que...\".",
                    "temas": "Experimentos aleatorios\nEspacio muestral\nEventos o sucesos\nResultados posibles\nComparación de probabilidades\nEventos más probables y menos probables\nEventos equiprobables\nProbabilidad cualitativa\nInterpretación de situaciones de azar\nResolución de problemas de probabilidad cualitativa",
                    "sessions_count": 6,
                    "verbo_rector": "Compara",
                    "complejidad": "Media",
                    "rango_sugerido": "10 a 12 sesiones"
          },
          {
                    "contenido": "Azar y probabilidad",
                    "pda_number": 31,
                    "topic": "Identifica eventos en los que interviene el azar, determina el espacio muestra! y experimenta.",
                    "temas": "Experimentos aleatorios\nAzar y eventos aleatorios\nEspacio muestral\nResultados posibles\nEventos o sucesos\nRegistro de resultados\nFrecuencia de un evento\nExperimentación con fenómenos aleatorios\nInterpretación de resultados experimentales",
                    "sessions_count": 5,
                    "verbo_rector": "Identifica",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          },
          {
                    "contenido": "Azar y probabilidad",
                    "pda_number": 32,
                    "topic": "Identifica diversos procedimientos de conteo y resuelve problemas.",
                    "temas": "Principio de conteo\nDiagramas de árbol\nTablas de conteo\nListado sistemático\nRegla del producto\nRegla de la suma\nEstrategias de conteo\nResolución de problemas de conteo",
                    "sessions_count": 5,
                    "verbo_rector": "Identifica",
                    "complejidad": "Baja",
                    "rango_sugerido": "8 a 10 sesiones"
          }
],
        2: [
            "Resuelve problemas de multiplicación y división con números enteros, fraccionarios y decimales.",
            "Resuelve problemas de proporcionalidad directa e inversa utilizando múltiples representaciones.",
            "Encuentra expresiones de segundo grado para definir sucesiones y patrones numéricos.",
            "Resuelve sistemas de dos ecuaciones lineales con dos incógnitas por diferentes métodos.",
            "Identifica las relaciones de congruencia y semejanza de triángulos y otros polígonos.",
            "Calcula el volumen de prismas y pirámides regulares utilizando fórmulas.",
            "Determina la probabilidad de eventos simples y calcula su frecuencia relativa.",
            "Interpreta medidas de dispersión (rango y desviación media) de un conjunto de datos."
        ],
        3: [
            "Resuelve ecuaciones de segundo grado (cuadráticas) por factorización y fórmula general.",
            "Aplica los teoremas de Pitágoras y Tales en la resolución de problemas geométricos reales.",
            "Resuelve problemas que implican el cálculo de volumen de cilindros y conos.",
            "Representa variaciones cuadráticas mediante tablas, gráficas y expresiones algebraicas.",
            "Determina la probabilidad de eventos complementarios, mutuamente excluyentes e independientes.",
            "Resuelve problemas de proporcionalidad múltiple y reflexiona sobre sus constantes de cambio.",
            "Diseña encuestas, recopila datos y realiza reportes estadísticos complejos en equipo.",
            "Interpreta las razones trigonométricas (seno, coseno y tangente) en triángulos rectángulos."
        ]
    },
    "Ciencias (Biología/Física/Química)": {
        1: [
            "Explica la importancia de la biodiversidad y el impacto de las actividades humanas en los ecosistemas.",
            "Identifica las características comunes de los seres vivos y la estructura básica de la célula.",
            "Valora los aportes de la ciencia en la preservación de la salud y el equilibrio biológico.",
            "Reconoce el funcionamiento del sistema inmunológico y la importancia de las vacunas.",
            "Analiza las causas y consecuencias del calentamiento global y propone acciones de mitigación.",
            "Explica los procesos de nutrición, respiración y reproducción humana y su relación con la salud.",
            "Describe las cadenas alimentarias y el flujo de energía en la biósfera.",
            "Investiga el papel de los microorganismos en la industria alimenticia y la medicina."
        ],
        2: [
            "Explica los conceptos de velocidad, aceleración y fuerzas en situaciones mecánicas cotidianas.",
            "Aplica las leyes del movimiento de Newton para predecir el comportamiento de los cuerpos.",
            "Describe la estructura de la materia, los estados de aggregación y el modelo de partículas.",
            "Reconoce las distintas manifestaciones de la energía y el principio de su conservación.",
            "Analiza el comportamiento de la luz y el sonido a través de fenómenos ondulatorios.",
            "Explica los fenómenos eléctricos y magnéticos y su aprovechamiento en la tecnología.",
            "Describe la estructura del Universo, el sistema solar y las teorías sobre su evolución.",
            "Analiza el funcionamiento térmico de los motores y los principios de la termodinámica."
        ],
        3: [
            "Identifica las propiedades de las sustancias (físicas y químicas) y los criterios para clasificarlas.",
            "Describe la estructura del átomo y las propiedades de la tabla periódica de los elementos.",
            "Representa las reacciones químicas mediante ecuaciones y aplica la ley de conservación de la masa.",
            "Reconoce la importancia de la química en el desarrollo sustentable y la industria.",
            "Explica la escala de pH, el carácter de las sustancias ácidas y básicas y su neutralización.",
            "Analiza las reacciones de óxido-reducción (redox) en procesos biológicos y tecnológicos.",
            "Investiga el impacto ambiental de los desechos químicos y propone alternativas de reciclaje.",
            "Describe la composición de los alimentos (nutrientes) y la energía que aportan al organismo."
        ]
    },
    "Historia": {
        1: [
            "Analiza los procesos de poblamiento inicial de América y la diversidad de las culturas prehispánicas.",
            "Describe el desarrollo de las culturas de Mesoamérica, Aridoamérica y Oasisamérica.",
            "Explica las causas y consecuencias de la conquista española y la caída de Tenochtitlan.",
            "Caracteriza la vida colonial en el Virreinato de la Nueva España (economía y sociedad).",
            "Identifica el papel de la Iglesia y las reformas borbónicas en la crisis del orden colonial.",
            "Analiza el proceso de Independencia de México y la conformación del Estado Nación.",
            "Compara las luchas entre liberales y conservadores durante el siglo XIX.",
            "Describe la invasión francesa, el imperio de Maximiliano y el triunfo de la República."
        ],
        2: [
            "Analiza los antecedentes, causas y etapas del desarrollo de la Revolución Mexicana.",
            "Describe la promulgación de la Constitución de 1917 y la reconstrucción nacional.",
            "Identifica el proceso de consolidación de las instituciones del Estado mexicano en el siglo XX.",
            "Explica el fenómeno de la industrialización, el milagro mexicano y las crisis económicas.",
            "Analiza los movimientos sociales estudiantiles, cívicos y obreros de la segunda mitad del siglo XX.",
            "Describe la transición democrática en México y los cambios en los partidos políticos.",
            "Investiga los efectos de la firma del Tratado de Libre Comercio (TLC) en la economía nacional.",
            "Valora la diversidad cultural actual y el reconocimiento de los derechos de los pueblos indígenas."
        ],
        3: [
            "Explica el desarrollo de la Primera y Segunda Guerra Mundial y su impacto en la geopolítica mundial.",
            "Analiza el proceso de la Guerra Fría y la división del mundo en bloques capitalista y socialista.",
            "Describe el proceso de descolonización en Asia y África durante el siglo XX.",
            "Identifica las causas de la caída del Bloque Socialista y la desintegración de la URSS.",
            "Analiza los desafíos actuales del mundo globalizado (migración, medio ambiente, desigualdad).",
            "Explica los conflictos políticos y bélicos recientes en Medio Oriente y otras regiones.",
            "Valora el papel de los organismos internacionales (ONU, OEA) en la resolución de conflictos.",
            "Reflexiona sobre el desarrollo de los derechos humanos en el panorama contemporáneo."
        ]
    },
    "Geografía": {
        1: [
            "Analiza la distribución de las formas del relieve y las regiones sísmicas y volcánicas.",
            "Explica las características de los climas y la biodiversidad en la superficie terrestre.",
            "Describe la dinámica de las aguas continentales y oceánicas en el planeta.",
            "Identifica las causas y consecuencias de la distribución de la población mundial.",
            "Analiza los flujos migratorios actuales y sus efectos en los países de origen y destino.",
            "Describe los recursos naturales y las principales actividades económicas en el espacio geográfico.",
            "Explica la importancia de la sustentabilidad y el cuidado del patrimonio natural.",
            "Identifica los factores que propician los riesgos y desastres naturales y antrópicos."
        ],
        2: [
            "Analiza la organización política y las fronteras de los países de América y el mundo.",
            "Describe los contrastes de desarrollo socioeconómico entre diferentes regiones geográficas.",
            "Explica la influencia del relieve y el clima en el desarrollo de las actividades agropecuarias.",
            "Identifica las características de los espacios urbanos y rurales y sus interconexiones.",
            "Analiza el papel de las telecomunicaciones y el transporte en la integración económica.",
            "Investiga los efectos de la deforestación y la pérdida de suelos en México y el mundo.",
            "Propone alternativas de ecoturismo y manejo sustentable de cuencas hidrológicas.",
            "Estudia la cartografía temática y utiliza sistemas de información geográfica (SIG) básicos."
        ],
        3: [
            "Analiza el impacto del crecimiento urbano acelerado en el abasto de agua y energía.",
            "Describe las consecuencias del cambio climático en las zonas costeras y agrícolas del país.",
            "Analiza el papel de los bloques económicos mundiales y el comercio internacional.",
            "Identifica las principales zonas turísticas del mundo y su impacto socioeconómico.",
            "Estudia los procesos de soberanía alimentaria y la distribución de recursos básicos.",
            "Analiza los conflictos territoriales e históricos por el control de recursos estratégicos.",
            "Valora las tecnologías limpias en el contexto del desarrollo sustentable a escala nacional.",
            "Elabora mapas y croquis de riesgos comunitarios para proponer planes de protección civil."
        ]
    },
    "Inglés": {
        1: [
            "Interchanges personal information, greetings, and expressions of politeness in everyday conversations.",
            "Identifies basic vocabulary about family, school, and community surroundings.",
            "Reads short simple texts in English, capturing general ideas and specific details.",
            "Writes simple sentences and short paragraphs about daily routines and hobbies.",
            "Asks and answers simple questions about price, color, size, and quantities.",
            "Follows and gives simple directions to reach a destination on a map.",
            "Identifies the main characteristics of cultural celebrations in English-speaking countries.",
            "Expresses simple likes and dislikes regarding food, music, sports, and movies."
        ],
        2: [
            "Participates in conversations expressing opinions and plans for the future.",
            "Reads and understands narrative texts, identifying characters and sequence of events.",
            "Writes short essays or descriptions of past events using simple past tense.",
            "Gives suggestions and recommendations about health, travel, and study habits.",
            "Compares places, objects, and people using comparative and superlative forms.",
            "Interprets basic instructions and warnings in public notices and manuals.",
            "Discusses environmental problems and suggests simple actions to help the planet.",
            "Understands and enjoys basic expressions in songs, poems, and short dialogues."
        ],
        3: [
            "Delivers short presentations in English about topics of scientific or social interest.",
            "Writes formal emails, letters, and curriculum vitae applying professional conventions.",
            "Reads complex informational articles, extracting conclusions and main arguments.",
            "Discusses hypothetical situations using conditional sentences (first and second conditional).",
            "Expresses points of view about global issues such as technology, media, and culture.",
            "Interprets and reviews simple literature or news stories in English.",
            "Participates in role-plays simulating professional interviews or business transactions.",
            "Produces creative writing, such as short stories, scripts, or blog articles in English."
        ]
    }
};

/**
 * Obtiene el verbo rector (la primera palabra) de una cadena de texto y la capitaliza.
 *
 * @param {string} text Texto del PDA
 * @returns {string} Verbo rector
 */
function getRectorVerb(text) {
    if (!text) return '';
    const cleanText = text.trim();
    const firstWord = cleanText.split(/\s+/)[0];
    // Quitar signos de puntuación de la primera palabra
    const verb = firstWord.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
    return verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase();
}
