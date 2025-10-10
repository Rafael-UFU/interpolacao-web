window.onload = () => {
    // --- ELEMENTOS DO DOM ---
    const imageLoader = document.getElementById('imageLoader');
    const resetButton = document.getElementById('resetButton');
    const downloadImageButton = document.getElementById('downloadImageButton');
    const downloadCsvButton = document.getElementById('downloadCsvButton');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const pointsTableContainer = document.getElementById('pointsTableContainer');
    const polynomialEquationContainer = document.getElementById('polynomialEquationContainer');

    // Controles de Estilo
    const pointsSizeSlider = document.getElementById('pointsSize');
    const linesThicknessSlider = document.getElementById('linesThickness');
    const polyColorInput = document.getElementById('polyColor');
    const splineColorInput = document.getElementById('splineColor');
    const pointsColorInput = document.getElementById('pointsColor');
    const togglePolyButton = document.getElementById('togglePolyButton');
    const toggleSplineButton = document.getElementById('toggleSplineButton');
    
    // Controles da Grade
    const toggleGridButton = document.getElementById('toggleGridButton');
    const gridColorInput = document.getElementById('gridColor');
    const gridThicknessSlider = document.getElementById('gridThickness');

    // Controles do Sistema de Coordenadas
    const coordModeButton = document.getElementById('coordModeButton');
    const manualCoordsDiv = document.getElementById('manual-coords');
    const interactiveCoordsDiv = document.getElementById('interactive-coords');
    const xMinInput = document.getElementById('xMin');
    const xMaxInput = document.getElementById('xMax');
    const yMinInput = document.getElementById('yMin');
    const yMaxInput = document.getElementById('yMax');
    const calibXValueInput = document.getElementById('calibXValue');
    const calibrationOverlay = document.getElementById('calibration-overlay');
    const calibrationText = document.getElementById('calibration-text');

    // --- ESTADO DA APLICAÇÃO ---
    let backgroundImage = null;
    let points = [];
    let polynomialCoefficients = [];
    let showPolynomial = true;
    let showSpline = true;
    let showGrid = true;
    let coordMode = 'manual';
    let calibrationStep = 'done';
    let calibOriginPixel = null;
    let calibXAxisPixel = null;

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

    canvas.addEventListener('click', handleCanvasClick);
    calibrationOverlay.addEventListener('click', handleCanvasClick);

    // Adiciona listeners para todos os inputs que devem redesenhar o canvas
    [pointsSizeSlider, linesThicknessSlider, polyColorInput, splineColorInput, pointsColorInput,
     gridColorInput, gridThicknessSlider, xMinInput, xMaxInput, yMinInput, yMaxInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                recalculateAllCustomCoords();
                redrawCanvas();
            });
        }
    });

    // ###############################################################
    // ### INÍCIO DA CORREÇÃO: LISTENERS DOS BOTÕES RESTAURADOS ###
    // ###############################################################

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

    toggleGridButton.addEventListener('click', () => {
        showGrid = !showGrid;
        toggleGridButton.textContent = showGrid ? 'Grade Visível' : 'Grade Oculta';
        toggleGridButton.classList.toggle('active', showGrid);
        redrawCanvas();
    });

    coordModeButton.addEventListener('click', toggleCoordMode);

    // ###############################################################
    // ### FIM DA CORREÇÃO ###
    // ###############################################################


    // --- FUNÇÕES ---
    // O restante das funções permanece o mesmo

    function reset() {
        points = [];
        polynomialCoefficients = [];
        coordMode = 'manual';
        if(coordModeButton) coordModeButton.textContent = 'Modo: Manual';
        if(manualCoordsDiv) manualCoordsDiv.classList.remove('hidden');
        if(interactiveCoordsDiv) interactiveCoordsDiv.classList.add('hidden');
        endCalibration();
        redrawCanvas();
        updatePointsTable();
        updatePolynomialDisplay();
    }
    
    function redrawCanvas() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0);
        if (showGrid) drawGrid();

        if (calibOriginPixel) drawCalibrationPoint(calibOriginPixel, 'O');
        if (calibXAxisPixel) drawCalibrationPoint(calibXAxisPixel, 'X');

        const customPoints = points.map(p => p.custom);
        if (customPoints.length > 1) {
            polynomialCoefficients = [];
            if (showPolynomial) drawPolynomialInterpolation(customPoints);
            if (showSpline) drawCubicSplineInterpolation(customPoints);
        } else {
            polynomialCoefficients = [];
        }
        
        points.forEach(p => drawPoint(p.pixel));
        updatePolynomialDisplay();
    }
    
    function updatePolynomialDisplay() {
        if (!polynomialEquationContainer) return;
        if (polynomialCoefficients.length < 1) {
            polynomialEquationContainer.innerHTML = "<p>Adicione 2 ou mais pontos para ver a equação.</p>";
            return;
        }
        let equation = "P(x) = ";
        let firstTerm = true;
        for (let i = polynomialCoefficients.length - 1; i >= 0; i--) {
            const coeff = polynomialCoefficients[i];
            if (Math.abs(coeff) < 1e-9) continue;
            const sign = coeff < 0 ? " - " : (firstTerm ? "" : " + ");
            const absCoeff = Math.abs(coeff);
            let coeffStr = absCoeff.toFixed(3);
            if (Math.abs(absCoeff - 1) < 1e-9 && i > 0) {
                coeffStr = "";
            }
            let term = "";
            if (i > 1) term = `${coeffStr}x^${i}`;
            else if (i === 1) term = `${coeffStr}x`;
            else term = coeffStr;
            equation += `${sign}${term}`;
            firstTerm = false;
        }
        if (firstTerm) equation = "P(x) = 0";
        polynomialEquationContainer.innerHTML = `<p>${equation}</p>`;
    }

    function toggleCoordMode() {
        if (coordMode === 'manual') {
            coordMode = 'interactive';
            coordModeButton.textContent = 'Iniciar Calibração';
            manualCoordsDiv.classList.add('hidden');
            interactiveCoordsDiv.classList.remove('hidden');
            startCalibration();
        } else {
            coordMode = 'manual';
            coordModeButton.textContent = 'Modo: Manual';
            manualCoordsDiv.classList.remove('hidden');
            interactiveCoordsDiv.classList.add('hidden');
            endCalibration();
        }
    }

    function startCalibration() {
        calibrationStep = 'origin';
        calibrationOverlay.classList.add('active');
        calibrationText.textContent = 'Clique na imagem para definir a ORIGEM (0, 0) do seu sistema.';
        points = [];
        calibOriginPixel = null;
        calibXAxisPixel = null;
        updatePointsTable();
        redrawCanvas();
    }

    function endCalibration() {
        calibrationStep = 'done';
        if(calibrationOverlay) calibrationOverlay.classList.remove('active');
        recalculateAllCustomCoords();
        redrawCanvas();
    }

    function handleCanvasClick(e) {
        if (!backgroundImage) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const pixelX = (e.clientX - rect.left) * scaleX;
        const pixelY = (e.clientY - rect.top) * scaleY;
        const pixelCoords = { x: pixelX, y: pixelY };

        if (coordMode === 'interactive' && calibrationStep !== 'done') {
            if (calibrationStep === 'origin') {
                calibOriginPixel = pixelCoords;
                calibrationStep = 'xAxis';
                const targetX = calibXValueInput.value;
                calibrationText.textContent = `Origem definida! Agora clique no ponto correspondente ao EIXO X = ${targetX}.`;
            } else if (calibrationStep === 'xAxis') {
                calibXAxisPixel = pixelCoords;
                endCalibration();
            }
            redrawCanvas();
        } else {
            const customCoords = pixelToCustom(pixelCoords);
            points.push({ pixel: pixelCoords, custom: customCoords });
            points.sort((a, b) => a.pixel.x - b.pixel.x);
            redrawCanvas();
            updatePointsTable();
        }
    }

    function pixelToCustom(pixelCoords) {
        if (coordMode === 'manual') {
            const xMin = parseFloat(xMinInput.value) || 0;
            const xMax = parseFloat(xMaxInput.value) || 10;
            const yMin = parseFloat(yMinInput.value) || 0;
            const yMax = parseFloat(yMaxInput.value) || 10;
            const customX = xMin + (pixelCoords.x / canvas.width) * (xMax - xMin);
            const customY = yMin + ((canvas.height - pixelCoords.y) / canvas.height) * (yMax - yMin);
            return { x: customX, y: customY };
        } else {
            if (!calibOriginPixel || !calibXAxisPixel) return { x: NaN, y: NaN };
            const pixelDistX = calibXAxisPixel.x - calibOriginPixel.x;
            if (Math.abs(pixelDistX) < 1) return { x: NaN, y: NaN };
            const scale = parseFloat(calibXValueInput.value) / pixelDistX;
            const customX = (pixelCoords.x - calibOriginPixel.x) * scale;
            const customY = (calibOriginPixel.y - pixelCoords.y) * scale;
            return { x: customX, y: customY };
        }
    }

    function recalculateAllCustomCoords() {
        points.forEach(p => { p.custom = pixelToCustom(p.pixel); });
        updatePointsTable();
    }

    function customToPixel(customCoords) {
        if (coordMode === 'manual') {
            const xMin = parseFloat(xMinInput.value) || 0;
            const xMax = parseFloat(xMaxInput.value) || 10;
            const yMin = parseFloat(yMinInput.value) || 0;
            const yMax = parseFloat(yMaxInput.value) || 10;
            if (xMax === xMin || yMax === yMin) return { x: 0, y: 0 };
            const px = ((customCoords.x - xMin) / (xMax - xMin)) * canvas.width;
            const py = canvas.height - (((customCoords.y - yMin) / (yMax - yMin)) * canvas.height);
            return { x: px, y: py };
        } else {
            if (!calibOriginPixel || !calibXAxisPixel) return { x: 0, y: 0 };
            const pixelDistX = calibXAxisPixel.x - calibOriginPixel.x;
            if (Math.abs(pixelDistX) < 1) return { x: 0, y: 0 };
            const scale = parseFloat(calibXValueInput.value) / pixelDistX;
            const px = (customCoords.x / scale) + calibOriginPixel.x;
            const py = calibOriginPixel.y - (customCoords.y / scale);
            return { x: px, y: py };
        }
    }

    function drawGrid() {
        if (!gridThicknessSlider) return;
        ctx.beginPath();
        ctx.strokeStyle = gridColorInput.value;
        ctx.lineWidth = parseFloat(gridThicknessSlider.value);
        const numLines = 10;
        for (let i = 0; i <= numLines; i++) {
            const x = (canvas.width / numLines) * i;
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let i = 0; i <= numLines; i++) {
            const y = (canvas.height / numLines) * i;
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    function drawPoint(pixelPoint) {
        if (!pointsSizeSlider) return;
        ctx.beginPath();
        ctx.arc(pixelPoint.x, pixelPoint.y, parseFloat(pointsSizeSlider.value), 0, 2 * Math.PI);
        ctx.fillStyle = pointsColorInput.value;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function drawCalibrationPoint(pixelPoint, label) {
        ctx.beginPath();
        ctx.arc(pixelPoint.x, pixelPoint.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pixelPoint.x, pixelPoint.y);
    }

    function drawCurve(curvePointsInCustom, color) {
        if (curvePointsInCustom.length < 2) return;
        const curvePointsInPixels = curvePointsInCustom.map(customToPixel);
        ctx.beginPath();
        ctx.moveTo(curvePointsInPixels[0].x, curvePointsInPixels[0].y);
        for (let i = 1; i < curvePointsInPixels.length; i++) {
            ctx.lineTo(curvePointsInPixels[i].x, curvePointsInPixels[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = parseFloat(linesThicknessSlider.value);
        ctx.stroke();
    }

    function updatePointsTable() {
        if (!pointsTableContainer) return;
        if (points.length === 0) {
            pointsTableContainer.innerHTML = "<p>Nenhum ponto adicionado.</p>";
            return;
        }
        let tableHTML = '<table><thead><tr><th>Ponto</th><th>X</th><th>Y</th></tr></thead><tbody>';
        points.forEach((p, index) => {
            tableHTML += `<tr><td>${index + 1}</td><td>${p.custom.x.toFixed(4)}</td><td>${p.custom.y.toFixed(4)}</td></tr>`;
        });
        tableHTML += '</tbody></table>';
        pointsTableContainer.innerHTML = tableHTML;
    }

    function drawPolynomialInterpolation(customPoints) {
        getPolynomialPointsAndCoeffs(customPoints);
        const polyPoints = getCurvePointsFromCoeffs(customPoints);
        if (polyPoints.length > 0) {
            drawCurve(polyPoints, polyColorInput.value);
        }
    }

    function getPolynomialPointsAndCoeffs(customPoints) {
        const n = customPoints.length;
        if (n < 2) {
            polynomialCoefficients = [];
            return;
        }
        const A = [], b = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < n; j++) row.push(Math.pow(customPoints[i].x, j));
            A.push(row);
            b.push(customPoints[i].y);
        }
        try {
            polynomialCoefficients = math.lusolve(A, b).map(val => val[0]);
        } catch (error) {
            console.error("Erro ao calcular coeficientes:", error);
            polynomialCoefficients = [];
        }
    }

    function getCurvePointsFromCoeffs(customPoints) {
        if (polynomialCoefficients.length === 0 || customPoints.length < 2) return [];
        const curvePoints = [];
        const xStart = customPoints[0].x;
        const xEnd = customPoints[customPoints.length - 1].x;
        const steps = canvas.width > 0 ? canvas.width : 500;
        for (let i = 0; i <= steps; i++) {
            const x = xStart + (i / steps) * (xEnd - xStart);
            let y = 0;
            for (let j = 0; j < polynomialCoefficients.length; j++) {
                y += polynomialCoefficients[j] * Math.pow(x, j);
            }
            curvePoints.push({ x, y });
        }
        return curvePoints;
    }
    
    function drawCubicSplineInterpolation(customPoints) {
        const splinePoints = getSplinePoints(customPoints);
        if (splinePoints.length > 0) drawCurve(splinePoints, splineColorInput.value);
    }
    
    function getSplinePoints(customPoints) {
        const n = customPoints.length;
        if (n < 2) return [];
        if (n === 2) return [...customPoints];
        const x = customPoints.map(p => p.x), y = customPoints.map(p => p.y);
        const h = []; for (let i = 0; i < n - 1; i++) h[i] = x[i + 1] - x[i];
        if (h.some(val => val <= 0)) return [];
        const alpha = []; for (let i = 1; i < n - 1; i++) alpha[i] = (3/h[i])*(y[i+1]-y[i]) - (3/h[i-1])*(y[i]-y[i-1]);
        const l = [1], mu = [0], z = [0];
        for (let i = 1; i < n - 1; i++) {
            l[i] = 2*(x[i+1]-x[i-1]) - h[i-1]*mu[i-1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i]-h[i-1]*z[i-1])/l[i];
        }
        l[n-1] = 1; z[n-1] = 0;
        const c = []; c[n-1] = 0;
        const b = [], d = [];
        for (let j = n - 2; j >= 0; j--) {
            c[j] = z[j] - mu[j] * c[j+1];
            b[j] = (y[j+1]-y[j])/h[j] - (h[j]*(c[j+1]+2*c[j]))/3;
            d[j] = (c[j+1]-c[j])/(3*h[j]);
        }
        const curvePoints = [];
        const stepsPerSegment = 100;
        for (let i = 0; i < n - 1; i++) {
            for (let step = 0; step < stepsPerSegment; step++) {
                const xi = x[i] + (step/stepsPerSegment)*h[i];
                const dx = xi - x[i];
                const yi = y[i] + b[i]*dx + c[i]*dx*dx + d[i]*dx*dx*dx;
                curvePoints.push({x: xi, y: yi});
            }
        }
        curvePoints.push(customPoints[n - 1]);
        return curvePoints;
    }
    
    function downloadImage() {
        redrawCanvas();
        const link = document.createElement('a');
        link.download = 'imagem_com_interpolacao.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function downloadCSV() {
        if (points.length < 2) {
            alert("Adicione pelo menos 2 pontos para gerar os dados.");
            return;
        }
        const customPoints = points.map(p => p.custom);
        getPolynomialPointsAndCoeffs(customPoints);
        const polyCustomPoints = getCurvePointsFromCoeffs(customPoints);
        const splineCustomPoints = getSplinePoints(customPoints);
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "No_Ponto,X_Ponto_Custom,Y_Ponto_Custom,X_Polinomial_Custom,Y_Polinomial_Custom,X_Spline_Custom,Y_Spline_Custom\n";
        const maxRows = Math.max(points.length, polyCustomPoints.length, splineCustomPoints.length);
        for (let i = 0; i < maxRows; i++) {
            let row = [];
            row.push(i < points.length ? i + 1 : '');
            row.push(i < points.length ? customPoints[i].x.toFixed(6) : '');
            row.push(i < points.length ? customPoints[i].y.toFixed(6) : '');
            row.push(i < polyCustomPoints.length ? polyCustomPoints[i].x.toFixed(6) : '');
            row.push(i < polyCustomPoints.length ? polyCustomPoints[i].y.toFixed(6) : '');
            row.push(i < splineCustomPoints.length ? splineCustomPoints[i].x.toFixed(6) : '');
            row.push(i < splineCustomPoints.length ? splineCustomPoints[i].y.toFixed(6) : '');
            csvContent += row.join(",") + "\n";
        }
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "dados_interpolacao_custom.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
