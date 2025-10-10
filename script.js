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
    let points = [];
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        points.push({ x, y });
        points.sort((a, b) => a.x - b.x); // Ordena pontos pela coordenada X

        redrawCanvas();
        updatePointsTable();
    });

    resetButton.addEventListener('click', reset);
    downloadImageButton.addEventListener('click', downloadImage);
    downloadCsvButton.addEventListener('click', downloadCSV);

    // Eventos para alternar visibilidade
    togglePolyButton.addEventListener('click', () => {
        showPolynomial = !showPolynomial;
        togglePolyButton.textContent = showPolynomial ? 'Ocultar Polinomial' : 'Mostrar Polinomial';
        togglePolyButton.classList.toggle('active', showPolynomial);
        redrawCanvas();
    });

    toggleSplineButton.addEventListener('click', () => {
        showSpline = !showSpline;
        toggleSplineButton.textContent = showSpline ? 'Ocultar Spline' : 'Mostrar Spline';
        toggleSplineButton.classList.toggle('active', showSpline);
        redrawCanvas();
    });

    // Eventos para mudança de cor
    polyColorInput.addEventListener('input', redrawCanvas);
    splineColorInput.addEventListener('input', redrawCanvas);
    pointsColorInput.addEventListener('input', redrawCanvas);

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

        points.forEach(p => drawPoint(p));

        if (points.length > 1) {
            if (showPolynomial) drawPolynomialInterpolation();
            if (showSpline) drawCubicSplineInterpolation();
        }
    }
    
    function updatePointsTable() {
        if (points.length === 0) {
            pointsTableContainer.innerHTML = "<p>Nenhum ponto adicionado.</p>";
            return;
        }

        let tableHTML = '<table><thead><tr><th>Ponto</th><th>X</th><th>Y</th></tr></thead><tbody>';
        points.forEach((p, index) => {
            tableHTML += `<tr><td>${index + 1}</td><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td></tr>`;
        });
        tableHTML += '</tbody></table>';
        pointsTableContainer.innerHTML = tableHTML;
    }


    // --- FUNÇÕES DE DESENHO AUXILIARES ---

    function drawPoint(point) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, POINT_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = pointsColorInput.value;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
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
    
    // --- LÓGICA DE INTERPOLAÇÃO E DADOS (sem alterações na matemática, apenas na chamada) ---

    function getPolynomialPoints() {
        const n = points.length;
        if (n < 2) return [];

        const A = [], b = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) row.push(Math.pow(points[i].x, j));
            A.push(row);
            b.push(points[i].y);
        }
        
        try {
            const coeffs = math.lusolve(A, b).map(val => val[0]);
            const curvePoints = [];
            for (let x = points[0].x; x <= points[n - 1].x; x++) {
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

    function drawPolynomialInterpolation() {
        const polyPoints = getPolynomialPoints();
        if(polyPoints.length > 0) drawCurve(polyPoints, polyColorInput.value);
    }

    function getSplinePoints() {
        const n = points.length;
        if (n < 2) return [];
        if (n === 2) return [...points];
        
        const x = points.map(p => p.x), y = points.map(p => p.y);
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
        curvePoints.push(points[n - 1]);
        return curvePoints;
    }

    function drawCubicSplineInterpolation() {
        const splinePoints = getSplinePoints();
        if(splinePoints.length > 0) drawCurve(splinePoints, splineColorInput.value);
    }
    
    function downloadCSV() {
        if (points.length < 2) {
            alert("Adicione pelo menos 2 pontos para gerar os dados.");
            return;
        }

        const polyPoints = getPolynomialPoints();
        const splinePoints = getSplinePoints();
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "No_Ponto,X_Ponto,Y_Ponto,X_Polinomial,Y_Polinomial,X_Spline,Y_Spline\n";

        const maxRows = Math.max(points.length, polyPoints.length, splinePoints.length);

        for (let i = 0; i < maxRows; i++) {
            let row = [];
            // Nós
            row.push(i < points.length ? i + 1 : '');
            row.push(i < points.length ? points[i].x.toFixed(4) : '');
            row.push(i < points.length ? points[i].y.toFixed(4) : '');
            // Polinomial
            row.push(i < polyPoints.length ? polyPoints[i].x.toFixed(4) : '');
            row.push(i < polyPoints.length ? polyPoints[i].y.toFixed(4) : '');
            // Spline
            row.push(i < splinePoints.length ? splinePoints[i].x.toFixed(4) : '');
            row.push(i < splinePoints.length ? splinePoints[i].y.toFixed(4) : '');
            
            csvContent += row.join(",") + "\n";
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "dados_interpolacao.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
