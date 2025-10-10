// Aguarda o carregamento completo da página
window.onload = () => {
    const imageLoader = document.getElementById('imageLoader');
    const resetButton = document.getElementById('resetButton');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    let backgroundImage = null;
    let points = []; // Array para armazenar os nós de interpolação {x, y}
    const POINT_RADIUS = 5;
    const POLY_COLOR = '#ff0000'; // Vermelho para polinomial padrão
    const SPLINE_COLOR = '#0000ff'; // Azul para spline cúbica

    // --- MANIPULADORES DE EVENTOS ---

    // Evento para carregar a imagem selecionada pelo usuário
    imageLoader.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            backgroundImage = new Image();
            backgroundImage.onload = () => {
                // Ajusta o tamanho do canvas para o tamanho da imagem
                canvas.width = backgroundImage.width;
                canvas.height = backgroundImage.height;
                reset();
            }
            backgroundImage.src = event.target.result;
        }
        reader.readAsDataURL(e.target.files[0]);
    });

    // Evento para adicionar um ponto ao clicar no canvas
    canvas.addEventListener('click', (e) => {
        if (!backgroundImage) {
            alert("Por favor, carregue uma imagem primeiro.");
            return;
        }
        // Pega as coordenadas do clique relativas ao canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        points.push({ x, y });
        // Ordena os pontos pela coordenada X para que as interpolações funcionem corretamente
        points.sort((a, b) => a.x - b.x);

        redrawCanvas();
    });

    // Evento para o botão de limpar
    resetButton.addEventListener('click', reset);

    function reset() {
        points = [];
        redrawCanvas();
    }

    // --- FUNÇÕES DE DESENHO ---

    function redrawCanvas() {
        // Limpa o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Desenha a imagem de fundo, se existir
        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0);
        }

        // Desenha os pontos (nós)
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, POINT_RADIUS, 0, 2 * Math.PI);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Se tivermos pelo menos 2 pontos, calcula e desenha as curvas
        if (points.length > 1) {
            drawPolynomialInterpolation();
            drawCubicSplineInterpolation();
        }
    }

    function drawCurve(curvePoints, color) {
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (let i = 1; i < curvePoints.length; i++) {
            ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // --- LÓGICA DE INTERPOLAÇÃO ---

    /**
     * INTERPOLAÇÃO POLINOMIAL PADRÃO
     * Resolve um sistema de equações lineares (matriz de Vandermonde) para encontrar
     * os coeficientes do polinômio P(x) = a0 + a1*x + a2*x^2 + ...
     */
    function drawPolynomialInterpolation() {
        const n = points.length;
        if (n < 2) return;

        // Monta a matriz de Vandermonde (A) e o vetor de resultados (b)
        const A = [];
        const b = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) {
                row.push(Math.pow(points[i].x, j));
            }
            A.push(row);
            b.push(points[i].y);
        }

        try {
            // Usa math.js para resolver o sistema Ax = b, encontrando os coeficientes
            const coeffs = math.lusolve(A, b).map(val => val[0]);

            const curvePoints = [];
            // Gera pontos na curva para desenhar, de x_min a x_max
            for (let x = points[0].x; x <= points[n - 1].x; x++) {
                let y = 0;
                for (let i = 0; i < n; i++) {
                    y += coeffs[i] * Math.pow(x, i);
                }
                curvePoints.push({ x, y });
            }
            drawCurve(curvePoints, POLY_COLOR);

        } catch (error) {
            console.error("Erro ao calcular a interpolação polinomial (matriz singular ou instável):", error);
        }
    }

    /**
     * INTERPOLAÇÃO POR SPLINE CÚBICA
     * Algoritmo para encontrar as splines cúbicas naturais. É mais complexo,
     * mas resulta em curvas muito mais suaves e estáveis.
     */
    function drawCubicSplineInterpolation() {
        const n = points.length;
        if (n < 2) return;

        // O algoritmo de spline cúbica precisa de pelo menos 3 pontos para ser "cúbico"
        // mas podemos tratar o caso de 2 pontos como uma linha reta.
        if (n === 2) {
            drawCurve(points, SPLINE_COLOR);
            return;
        }

        const x = points.map(p => p.x);
        const y = points.map(p => p.y);

        const h = [];
        for (let i = 0; i < n - 1; i++) h[i] = x[i + 1] - x[i];

        const alpha = [];
        for (let i = 1; i < n - 1; i++) {
            alpha[i] = (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]);
        }

        const l = [1];
        const mu = [0];
        const z = [0];
        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }

        l[n - 1] = 1;
        z[n - 1] = 0;
        const c = [];
        c[n - 1] = 0;

        const b = [], d = [];
        for (let j = n - 2; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j + 1];
            b[j] = (y[j + 1] - y[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
            d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
        }

        const curvePoints = [];
        for (let i = 0; i < n - 1; i++) {
            for (let xi = x[i]; xi < x[i + 1]; xi++) {
                const dx = xi - x[i];
                const yi = y[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
                curvePoints.push({ x: xi, y: yi });
            }
        }
        // Adiciona o último ponto para garantir que a curva termine corretamente
        curvePoints.push(points[n-1]);
        
        drawCurve(curvePoints, SPLINE_COLOR);
    }
};
