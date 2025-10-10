window.onload = () => {
    // --- ELEMENTOS DO DOM ---
    // ... (todos os elementos anteriores)
    const polynomialEquationContainer = document.getElementById('polynomialEquationContainer'); // Novo elemento

    // --- ESTADO DA APLICAÇÃO ---
    // ... (todos os estados anteriores)
    let polynomialCoefficients = []; // NOVO: Armazena os coeficientes

    // --- MANIPULADORES DE EVENTOS ---
    // ... (todos os manipuladores de evento anteriores)

    // --- LÓGICA DE COORDENADAS E CALIBRAÇÃO ---
    // ... (toda a lógica anterior)

    // --- FUNÇÕES PRINCIPAIS E DE DESENHO ---

    function reset() {
        points = [];
        polynomialCoefficients = []; // Limpa os coeficientes
        coordMode = 'manual';
        coordModeButton.textContent = 'Modo: Manual';
        manualCoordsDiv.classList.remove('hidden');
        interactiveCoordsDiv.classList.add('hidden');
        endCalibration();
        redrawCanvas();
        updatePointsTable();
        updatePolynomialDisplay(); // Limpa a exibição da equação
    }
    
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0);
        if (showGrid) drawGrid();

        if (calibOriginPixel) drawCalibrationPoint(calibOriginPixel, 'O');
        if (calibXAxisPixel) drawCalibrationPoint(calibXAxisPixel, 'X');

        const customPoints = points.map(p => p.custom);
        if (customPoints.length > 1) {
            if (showPolynomial) drawPolynomialInterpolation(customPoints);
            if (showSpline) drawCubicSplineInterpolation(customPoints);
        } else {
            polynomialCoefficients = []; // Limpa se não há pontos suficientes
        }
        
        points.forEach(p => drawPoint(p.pixel));
        updatePolynomialDisplay(); // Atualiza a exibição da equação a cada redesenho
    }

    // ... (funções customToPixel, drawGrid, drawPoint, etc. sem alterações)

    // --- LÓGICA DE INTERPOLAÇÃO E DADOS ---
    
    // ATUALIZADO: drawPolynomialInterpolation agora também chama a função que atualiza os coeficientes
    function drawPolynomialInterpolation(customPoints) {
        const polyPoints = getPolynomialPointsAndCoeffs(customPoints); // Usa a nova função
        if(polyPoints.length > 0) {
            drawCurve(polyPoints, polyColorInput.value);
        }
    }

    // ATUALIZADO: getPolynomialPoints agora foi renomeada para indicar que também retorna os coeficientes
    function getPolynomialPointsAndCoeffs(customPoints) {
        const n = customPoints.length;
        if (n < 2) {
            polynomialCoefficients = [];
            return [];
        }

        const A = [], b = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) row.push(Math.pow(customPoints[i].x, j));
            A.push(row);
            b.push(customPoints[i].y);
        }
        
        try {
            // ATUALIZA O ESTADO GLOBAL DOS COEFICIENTES
            polynomialCoefficients = math.lusolve(A, b).map(val => val[0]);

            const curvePoints = [];
            const xStart = customPoints[0].x;
            const xEnd = customPoints[n - 1].x;
            const steps = canvas.width > 0 ? canvas.width : 500;
            for (let i = 0; i <= steps; i++) {
                const x = xStart + (i/steps) * (xEnd - xStart);
                let y = 0;
                for (let j = 0; j < n; j++) y += polynomialCoefficients[j] * Math.pow(x, j);
                curvePoints.push({ x, y });
            }
            return curvePoints;
        } catch (error) {
            console.error("Erro ao calcular a interpolação polinomial:", error);
            polynomialCoefficients = [];
            return [];
        }
    }

    // NOVA FUNÇÃO: Formata e exibe a equação do polinômio
    function updatePolynomialDisplay() {
        if (polynomialCoefficients.length < 1) {
            polynomialEquationContainer.innerHTML = "<p>Adicione 2 ou mais pontos para ver a equação.</p>";
            return;
        }

        let equation = "P(x) = ";
        let firstTerm = true;

        for (let i = polynomialCoefficients.length - 1; i >= 0; i--) {
            const coeff = polynomialCoefficients[i];

            // Ignora termos com coeficientes muito pequenos (próximos de zero)
            if (Math.abs(coeff) < 1e-9) {
                continue;
            }

            const sign = coeff < 0 ? " - " : (firstTerm ? "" : " + ");
            const absCoeff = Math.abs(coeff);

            let coeffStr = absCoeff.toFixed(2);
            // Oculta o coeficiente se for 1 (e não for o termo constante)
            if (Math.abs(absCoeff - 1) < 1e-9 && i > 0) {
                coeffStr = "";
            }

            let term = "";
            if (i > 1) {
                term = `${coeffStr}x^${i}`;
            } else if (i === 1) {
                term = `${coeffStr}x`;
            } else { // i === 0
                term = coeffStr;
            }

            equation += `${sign}${term}`;
            firstTerm = false;
        }

        if (firstTerm) { // Caso todos os coeficientes sejam zero
            equation = "P(x) = 0";
        }

        polynomialEquationContainer.innerHTML = `<p>${equation}</p>`;
    }


    // O restante das funções (getSplinePoints, downloadCSV, etc.) permanece o mesmo.
    // Colei o código completo novamente para garantir que nada falte.
    
    // Funções omitidas na resposta anterior, mas presentes aqui para garantir a funcionalidade
    function drawCubicSplineInterpolation(customPoints) {
        const splinePoints = getSplinePoints(customPoints);
        if(splinePoints.length > 0) drawCurve(splinePoints, splineColorInput.value);
    }
    
    function getSplinePoints(customPoints) {
        const n = customPoints.length;
        if (n < 2) return [];
        if (n === 2) return [...customPoints];
        
        const x = customPoints.map(p => p.x), y = customPoints.map(p => p.y);
        const h = []; for (let i = 0; i < n - 1; i++) h[i] = x[i + 1] - x[i];
        if (h.some(val => val <= 0)) {
            return [];
        }
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
        const stepsPerSegment = 100;
        for (let i = 0; i < n - 1; i++) {
            for (let step = 0; step < stepsPerSegment; step++) {
                const xi = x[i] + (step/stepsPerSegment) * h[i];
                const dx = xi - x[i];
                const yi = y[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
                curvePoints.push({ x: xi, y: yi });
            }
        }
        curvePoints.push(customPoints[n - 1]);
        return curvePoints;
    }

    //... (Restante das funções, como handleCanvasClick, customToPixel, etc., da versão anterior)
}; // Fim do window.onload
