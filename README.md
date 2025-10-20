# interpolacao-web

Aplicação web para visualização de interpolações. Faça upload de uma imagem, selecione pontos e compare as curvas geradas por Interpolação Polinomial padrão e Splines Cúbicas. Projeto 100% client-side com HTML, CSS e JavaScript, ideal para fins educacionais e hospedagem no GitHub Pages.


# Ferramenta Didática para Interpolação de Curvas

Uma aplicação web interativa desenvolvida como parte de um projeto de mestrado, projetada para visualizar, analisar e comparar métodos de interpolação polinomial sobre uma imagem definida pelo usuário. A ferramenta tem um forte apelo didático, permitindo a exploração de conceitos matemáticos de forma visual e prática.

---
# Em construção!
![Demonstração da Ferramenta](https://i.imgur.com/link-para-sua-imagem.gif)
*Sugestão: grave um GIF rápido mostrando a ferramenta em ação e substitua o link acima.*

---

## 🚀 Acesso à Ferramenta

A aplicação está hospedada no GitHub Pages e pode ser acessada publicamente através do link abaixo:

**[https://rafael-ufu.github.io/interpolacao-web/](https://rafael-ufu.github.io/interpolacao-web/)**


---

## ✨ Funcionalidades

A ferramenta oferece uma gama de funcionalidades para apoiar o ensino e a aprendizagem de interpolação de curvas:

-   🖼️ **Upload de Imagem:** Utilize qualquer imagem como plano de fundo para contextualizar a análise.
-   🖱️ **Seleção Interativa de Pontos:** Clique diretamente na imagem para adicionar os nós de interpolação.
-   📈 **Dupla Visualização:** Gere e compare em tempo real a **Interpolação Polinomial Padrão** e as **Splines Cúbicas**, observando visualmente suas diferenças de comportamento.
-   📐 **Sistema de Coordenadas Personalizado:** Abstraia os pixels! Defina a escala e a origem dos eixos (X e Y) manualmente ou através de um modo de calibração interativo, ideal para analisar dados de gráficos ou fenômenos físicos.
-   🌐 **Grade Visual:** Exiba uma grade sobre a imagem para facilitar a leitura das coordenadas, com controles para ajustar sua cor e espessura.
-   🎨 **Controles de Estilo:** Ajuste dinamicamente o tamanho dos pontos, a espessura das curvas e as cores de cada elemento para melhor visualização e apresentação.
-   ➗ **Exibição da Equação:** Veja em tempo real a equação geral do polinômio interpolador que passa pelos pontos selecionados.
-   💾 **Exportação de Dados:**
    -   Faça o download da imagem final (canvas) com as curvas e os pontos desenhados.
    -   Baixe uma planilha `.csv` contendo as coordenadas dos pontos selecionados e dos pontos calculados para cada curva, tudo no sistema de coordenadas que você definiu.

---

## 📖 Como Usar

1.  **Carregue uma Imagem:** Clique em "Selecione uma imagem" para fazer o upload de um arquivo do seu dispositivo.
2.  **Defina o Sistema de Coordenadas:**
    -   **Modo Manual (Padrão):** Insira os valores mínimos e máximos para os eixos X e Y.
    -   **Modo Interativo:** Clique em "Iniciar Calibração" e siga as instruções, clicando na imagem para definir a origem (0,0) e um ponto de referência no eixo X.
3.  **Adicione os Pontos:** Clique na imagem nos locais desejados para adicionar os nós de interpolação. A tabela de coordenadas e as curvas serão atualizadas automaticamente.
4.  **Explore e Analise:** Use os controles no painel para ligar/desligar as curvas, a grade, ajustar cores, tamanhos e observar a equação gerada.
5.  **Exporte os Resultados:** Clique em "Baixar Imagem" ou "Baixar Dados (.csv)" para salvar seu trabalho.

---

## 🎓 Contexto Acadêmico

Este projeto foi desenvolvido como produto educacional para a dissertação do Mestrado Profissional em Matemática em Rede Nacional (PROFMAT), sob a orientação do Prof. Dr. Rafael Figueiredo.

-   **Título do Projeto:** "Interpolação Polinomial e Ajute de Curvas: Aplicações em Trajetórias Físicas e Representações Artísticas"
-   **Ano:** 2025
-   **Aluno de Mestrado:** Antônio Marcos da Silva Leite
-   **Professor Orientador:** Prof. Dr. Rafael Figueiredo
-   **Instituição:** Universidade Federal de Uberlândia (UFU)
-   **Unidade:** Instituto de Matemática e Estatística (IME)

---

## 🛠️ Tecnologias Utilizadas

Este projeto é 100% client-side, executado inteiramente no navegador, sem a necessidade de um backend.

-   **HTML5**
-   **CSS3**
-   **JavaScript (ES6+)**
-   **[Math.js](https://mathjs.org/)**: Biblioteca utilizada para os cálculos matriciais necessários para encontrar os coeficientes do polinômio interpolador.

---

## ⚙️ Executando Localmente

Como não há dependências de servidor, executar o projeto localmente é muito simples:

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
    ```
2.  Navegue até a pasta do projeto.
3.  Abra o arquivo `index.html` diretamente no seu navegador de preferência.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
