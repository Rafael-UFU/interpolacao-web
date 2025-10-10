window.onload = () => {
    // --- ELEMENTOS DO DOM ---
    const imageLoader = document.getElementById('imageLoader');
    const resetButton = document.getElementById('resetButton');
    const downloadImageButton = document.getElementById('downloadImageButton');
    const downloadCsvButton = document.getElementById('downloadCsvButton');
    const togglePolyButton = document.getElementById('togglePolyButton');
    const toggleSplineButton = document.getElementById('toggleSplineButton');
    const polyColorInput = document.getElementById('polyColor');
    const splineColorInput = document.getElementById('splineColor');
    const pointsColorInput = document.getElementById('pointsColor');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const pointsTableContainer = document.getElementById('pointsTableContainer');

    // --- ESTADO DA APLICAÇÃO ---
    let backgroundImage = null;
    let points = []; // Array para armazenar { pixel: {x, y}, normalized: {x, y} }
    let showPolynomial = true;
    let showSpline = true;

    // --- CONSTANTES ---
    const POINT_RADIUS = 5;

    // --- MANIPULADORES DE EVENTOS ---

    imageLoader.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            backgroundImage = new Image();
            backgroundImage.onload = () => {
                canvas.width = backgroundImage.width;
                canvas.height = backgroundImage.height;
                reset();
            };
            backgroundImage.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    });

    canvas.addEventListener('click', (e) => {
        if (!backgroundImage) {
            alert("Por favor, carregue uma imagem primeiro.");
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const pixelX = e.clientX - rect.left;
        const pixelY = e.clientY - rect.top;

        // 4) NORMALIZAÇÃO: Origem no canto inferior esquerdo
        const normalizedX = pixelX / canvas.width;
        const normalizedY = (canvas.height - pixelY) / canvas.height;

        points.push({ 
            pixel: { x: pixelX, y: pixelY }, 
            normalized: { x: normalizedX, y: normalizedY }
        });

        // Ordena pontos pela coordenada X em pixels
        points.sort((a, b) => a.pixel.x - b.pixel.x);

        redrawCanvas();
        updatePointsTable();
    });

    resetButton.addEventListener('click', reset);
    downloadImageButton.addEventListener('click', downloadImage);
    downloadCsvButton.addEventListener('click', downloadCSV);

    togglePolyButton.addEventListener('click', () => {
        showPolynomial = !showPolynomial;
        togglePolyButton.textContent = showPolynomial ? 'Polinomial Visível' : 'Polinomial Oculta';
        togglePolyButton.classList.toggle('active', showPolynomial);
        redrawCanvas();
    });

    toggleSplineButton.addEventListener('click', () => {
        showSpline = !showSpline;
        toggleSplineButton.textContent = showSpline ? 'Spline Visível' : 'Spline Oculta';
        toggleSplineButton.classList.toggle('active', showSpline);
        redrawCanvas();
    });

    [polyColorInput, splineColorInput, pointsColorInput].forEach(input => {
        input.addEventListener('input', redrawCanvas);
    });

    // --- FUNÇÕES PRINCIPAIS ---

    function reset() {
        points = [];
        redrawCanvas();
        updatePointsTable();
    }
    
    function downloadImage() {
        const link = document.createElement('a');
        link.download = 'imagem_com_interpolacao.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0);

        points.forEach(p => drawPoint(p.pixel));

        if (points.length > 1) {
            const pixelPoints = points.map(p => p.pixel);
            if (showPolynomial) drawPolynomialInterpolation(pixelPoints);
            if (showSpline) drawCubicSplineInterpolation(pixelPoints);
        }
    }
    
    function updatePointsTable() {
        if (points.length === 0) {
            pointsTableContainer.innerHTML = "<p>Nenhum ponto adicionado.</p>";
            return;
        }

        let tableHTML = '<table><thead><tr><th>Ponto</th><th>X (norm)</th><th>Y (norm)</th></tr></thead><tbody>';
        points.forEach((p, index) => {
            tableHTML += `<tr>
                <td>${index + 1}</td>
                <td>${p.normalized.x.toFixed(4)}</td>
                <td>${p.normalized.y.toFixed(4)}</td>
            </tr>`;
        });
        tableHTML += '</tbody></table>';
        pointsTableContainer.innerHTML = tableHTML;
    }


    // --- FUNÇÕES DE DESENHO AUXILIARES ---

    function drawPoint(pixelPoint) {
        ctx.beginPath();
        ctx.arc(pixelPoint.x, pixelPoint.y, POINT_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = pointsColorInput.value;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawCurve(curvePoints, color) {
        if (curvePoints.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (let i = 1; i < curvePoints.length; i++) {
            ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth: 3;
        ctx.stroke();
    }
    
    // --- LÓGICA DE INTERPOLAÇÃO E DADOS ---

    function getPolynomialPoints(pixelPoints) {
        const n = pixelPoints.length;
        if (n < 2) return [];

        const A = [], b = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) row.push(Math.pow(pixelPoints[i].x, j));
            A.push(row);
            b.push(pixelPoints[i].y);
        }
        
        try {
            const coeffs = math.lusolve(A, b).map(val => val[0]);
            const curvePoints = [];
            for (let x = pixelPoints[0].x; x <= pixelPoints[n - 1].x; x++) {
                let y = 0;
                for (let i = 0; i < n; i++) y += coeffs[i] * Math.pow(x, i);
                curvePoints.push({ x, y });
            }
            return curvePoints;
        } catch (error) {
            console.error("Erro ao calcular a interpolação polinomial:", error);
            return [];
        }
    }

    function drawPolynomialInterpolation(pixelPoints) {
        const polyPoints = getPolynomialPoints(pixelPoints);
        if(polyPoints.length > 0) drawCurve(polyPoints, polyColorInput.value);
    }

    function getSplinePoints(pixelPoints) {
        const n = pixelPoints.length;
        if (n < 2) return [];
        if (n === 2) return [...pixelPoints];
        
        const x = pixelPoints.map(p => p.x), y = pixelPoints.map(p => p.y);
        const h = []; for (let i = 0; i < n - 1; i++) h[i] = x[i + 1] - x[i];
        const alpha = []; for (let i = 1; i < n - 1; i++) alpha[i] = (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]);
        const l = [1], mu = [0], z = [0];
        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }
        l[n - 1] = 1; z[n - 1] = 0;
        const c = []; c[n - 1] = 0;
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
        curvePoints.push(pixelPoints[n - 1]);
        return curvePoints;
    }

    function drawCubicSplineInterpolation(pixelPoints) {
        const splinePoints = getSplinePoints(pixelPoints);
        if(splinePoints.length > 0) drawCurve(splinePoints, splineColorInput.value);
    }
    
    function downloadCSV() {
        if (points.length < 2) {
            alert("Adicione pelo menos 2 pontos para gerar os dados.");
            return;
        }

        const pixelPoints = points.map(p => p.pixel);
        const polyPixelPoints = getPolynomialPoints(pixelPoints);
        const splinePixelPoints = getSplinePoints(pixelPoints);

        // Função auxiliar para normalizar os pontos da curva calculados em pixels
        const normalizePixelPoint = (p) => ({
            x: p.x / canvas.width,
            y: (canvas.height - p.y) / canvas.height
        });

        const polyNormPoints = polyPixelPoints.map(normalizePixelPoint);
        const splineNormPoints = splinePixelPoints.map(normalizePixelPoint);
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "No_Ponto,X_Ponto_Norm,Y_Ponto_Norm,X_Polinomial_Norm,Y_Polinomial_Norm,X_Spline_Norm,Y_Spline_Norm\n";

        const maxRows = Math.max(points.length, polyNormPoints.length, splineNormPoints.length);

        for (let i = 0; i < maxRows; i++) {
            let row = [];
            // Nós normalizados
            row.push(i < points.length ? i + 1 : '');
            row.push(i < points.length ? points[i].normalized.x.toFixed(6) : '');
            row.push(i < points.length ? points[i].normalized.y.toFixed(6) : '');
            // Polinomial normalizado
            row.push(i < polyNormPoints.length ? polyNormPoints[i].x.toFixed(6) : '');
            row.push(i < polyNormPoints.length ? polyNormPoints[i].y.toFixed(6) : '');
            // Spline normalizado
            row.push(i < splineNormPoints.length ? splineNormPoints[i].x.toFixed(6) : '');
            row.push(i < splineNormPoints.length ? splineNormPoints[i].y.toFixed(6) : '');
            
            csvContent += row.join(",") + "\n";
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "dados_interpolacao_normalizados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
