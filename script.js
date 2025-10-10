window.onload = () => {
    // --- ELEMENTOS DO DOM ---
    const imageLoader = document.getElementById('imageLoader');
    const resetButton = document.getElementById('resetButton');
    const downloadImageButton = document.getElementById('downloadImageButton');
    const downloadCsvButton = document.getElementById('downloadCsvButton');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

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

    const pointsTableContainer = document.getElementById('pointsTableContainer');

    // --- ESTADO DA APLICAÇÃO ---
    let backgroundImage = null;
    let points = []; // Array para armazenar { pixel: {x, y}, custom: {x, y} }
    let showPolynomial = true;
    let showSpline = true;
    let showGrid = true;
    let coordMode = 'manual'; // 'manual' ou 'interactive'
    let calibrationStep = 'done'; // 'origin', 'xAxis', 'done'
    let calibOriginPixel = null; // Pixel da origem na calibração
    let calibXAxisPixel = null; // Pixel do eixo X na calibração

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

    // Eventos de mudança nos controles redesenham o canvas
    [pointsSizeSlider, linesThicknessSlider, polyColorInput, splineColorInput, pointsColorInput,
     gridColorInput, gridThicknessSlider, xMinInput, xMaxInput, yMinInput, yMaxInput].forEach(input => {
        input.addEventListener('input', redrawCanvas);
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

    toggleGridButton.addEventListener('click', () => {
        showGrid = !showGrid;
        toggleGridButton.textContent = showGrid ? 'Grade Visível' : 'Grade Oculta';
        toggleGridButton.classList.toggle('active', showGrid);
        redrawCanvas();
    });

    coordModeButton.addEventListener('click', toggleCoordMode);

    // --- LÓGICA DE COORDENADAS E CALIBRAÇÃO ---

    function toggleCoordMode() {
        if (coordMode === 'manual') {
            coordMode = 'interactive';
            coordModeButton.textContent = 'Modo: Interativo (Calibrar)';
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
        recalculateAllCustomCoords(); // Recalcula os pontos existentes com o novo sistema
        redrawCanvas();
    }

    function startCalibration() {
        calibrationStep = 'origin';
        calibrationOverlay.classList.remove('hidden');
        calibrationOverlay.classList.add('active');
        calibrationText.textContent = 'Clique na imagem para definir a ORIGEM (0, 0) do seu sistema.';
        points = []; // Limpa os pontos ao iniciar uma nova calibração
        updatePointsTable();
    }

    function endCalibration() {
        calibrationStep = 'done';
        calibrationOverlay.classList.add('hidden');
        calibrationOverlay.classList.remove('active');
    }

    function handleCanvasClick(e) {
        if (!backgroundImage) {
            alert("Por favor, carregue uma imagem primeiro.");
            return;
        }

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
            redrawCanvas(); // Desenha os pontos de calibração
        } else {
            const customCoords = pixelToCustom(pixelCoords);
            points.push({ pixel: pixelCoords, custom: customCoords });
            points.sort((a, b) => a.pixel.x - b.pixel.x);
            redrawCanvas();
            updatePointsTable();
        }
    }

    // Funções de Mapeamento de Coordenadas
    function pixelToCustom(pixelCoords) {
        if (coordMode === 'manual') {
            const xMin = parseFloat(xMinInput.value) || 0;
            const xMax = parseFloat(xMaxInput.value) || 10;
            const yMin = parseFloat(yMinInput.value) || 0;
            const yMax = parseFloat(yMaxInput.value) || 10;
            
            const customX = xMin + (pixelCoords.x / canvas.width) * (xMax - xMin);
            const customY = yMin + ((canvas.height - pixelCoords.y) / canvas.height) * (yMax - yMin); // Y invertido
            return { x: customX, y: customY };
        } else { // interactive
            if (!calibOriginPixel || !calibXAxisPixel) return { x: NaN, y: NaN };
            
            const pixelDistX = calibXAxisPixel.x - calibOriginPixel.x;
            const scale = parseFloat(calibXValueInput.value) / pixelDistX;
            
            const customX = (pixelCoords.x - calibOriginPixel.x) * scale;
            const customY = (calibOriginPixel.y - pixelCoords.y) * scale; // Y invertido
            return { x: customX, y: customY };
        }
    }

    function recalculateAllCustomCoords() {
        points.forEach(p => {
            p.custom = pixelToCustom(p.pixel);
        });
        updatePointsTable();
    }

    // --- FUNÇÕES PRINCIPAIS E DE DESENHO ---

    function reset() {
        points = [];
        calibOriginPixel = null;
        calibXAxisPixel = null;
        if (coordMode === 'interactive') {
            startCalibration();
        }
        redrawCanvas();
        updatePointsTable();
    }
    
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0);
        if (showGrid) drawGrid();

        // Desenha os pontos de calibração se estiverem definidos
        if (calibOriginPixel) drawCalibrationPoint(calibOriginPixel, 'O');
        if (calibXAxisPixel) drawCalibrationPoint(calibXAxisPixel, 'X');

        const pixelPoints = points.map(p => p.pixel);
        if (pixelPoints.length > 1) {
            if (showPolynomial) drawPolynomialInterpolation(pixelPoints);
            if (showSpline) drawCubicSplineInterpolation(pixelPoints);
        }
        points.forEach(p => drawPoint(p.pixel)); // Desenha os pontos por último para ficarem no topo
        
        // Atualiza a tabela com o sistema de coordenadas atual
        recalculateAllCustomCoords();
    }
    
    function drawGrid() {
        const numLines = 10; // Desenha 10 linhas principais
        ctx.beginPath();
        ctx.strokeStyle = gridColorInput.value;
        ctx.lineWidth = parseFloat(gridThicknessSlider.value);

        const xMin = parseFloat(xMinInput.value) || 0;
        const xMax = parseFloat(xMaxInput.value) || 10;
        const yMin = parseFloat(yMinInput.value) || 0;
        const yMax = parseFloat(yMaxInput.value) || 10;

        // Linhas verticais
        for (let i = 0; i <= numLines; i++) {
            const x = (canvas.width / numLines) * i;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        // Linhas horizontais
        for (let i = 0; i <= numLines; i++) {
            const y = (canvas.height / numLines) * i;
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }
    
    function drawPoint(pixelPoint) {
        ctx.beginPath();
        ctx.arc(pixelPoint.x, pixelPoint.y, parseFloat(pointsSizeSlider.value), 0, 2 * Math.PI);
        ctx.fillStyle = pointsColorInput.value;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawCalibrationPoint(pixelPoint, label) {
        ctx.beginPath();
        ctx.arc(pixelPoint.x, pixelPoint.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
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
    
    function drawCurve(curvePoints, color) {
        if (curvePoints.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        for (let i = 1; i < curvePoints.length; i++) {
            ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = parseFloat(linesThicknessSlider.value);
        ctx.stroke();
    }
    
    function updatePointsTable() {
        if (points.length === 0) {
            pointsTableContainer.innerHTML = "<p>Nenhum ponto adicionado.</p>";
            return;
        }

        let tableHTML = '<table><thead><tr><th>Ponto</th><th>X</th><th>Y</th></tr></thead><tbody>';
        points.forEach((p, index) => {
            tableHTML += `<tr>
                <td>${index + 1}</td>
                <td>${p.custom.x.toFixed(4)}</td>
                <td>${p.custom.y.toFixed(4)}</td>
            </tr>`;
        });
        tableHTML += '</tbody></table>';
        pointsTableContainer.innerHTML = tableHTML;
    }

    // --- DOWNLOADS E INTERPOLAÇÃO (Lógica de interpolação em si não muda) ---
    // (As funções de download e getPolynomial/SplinePoints foram omitidas por brevidade,
    // pois a lógica interna delas não muda, apenas a forma como os dados são preparados
    // para o CSV no final)
    
    function downloadImage() { /* ...código anterior... */ }
    function getPolynomialPoints(pixelPoints) { /* ...código anterior... */ }
    function drawPolynomialInterpolation(pixelPoints) { /* ...código anterior... */ }
    function getSplinePoints(pixelPoints) { /* ...código anterior... */ }
    function drawCubicSplineInterpolation(pixelPoints) { /* ...código anterior... */ }

    function downloadCSV() {
        if (points.length < 2) {
            alert("Adicione pelo menos 2 pontos para gerar os dados.");
            return;
        }

        const pixelPoints = points.map(p => p.pixel);
        const polyPixelPoints = getPolynomialPoints(pixelPoints);
        const splinePixelPoints = getSplinePoints(pixelPoints);

        const polyCustomPoints = polyPixelPoints.map(pixelToCustom);
        const splineCustomPoints = splinePixelPoints.map(pixelToCustom);
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "No_Ponto,X_Ponto_Custom,Y_Ponto_Custom,X_Polinomial_Custom,Y_Polinomial_Custom,X_Spline_Custom,Y_Spline_Custom\n";

        const maxRows = Math.max(points.length, polyCustomPoints.length, splineCustomPoints.length);

        for (let i = 0; i < maxRows; i++) {
            let row = [];
            row.push(i < points.length ? i + 1 : '');
            row.push(i < points.length ? points[i].custom.x.toFixed(6) : '');
            row.push(i < points.length ? points[i].custom.y.toFixed(6) : '');
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
