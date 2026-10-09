// Banco de perguntas por matéria: [pergunta, [alternativas], índiceCorreto]
// Para adicionar perguntas, basta incluir novas linhas em qualquer matéria.
window.QUIZ_BANK = {
  matematica: { nome: "MATEMÁTICA", q: [
    ["2 + 2 = ?", ["3", "4", "5"], 1], ["5 × 3 = ?", ["15", "12", "18"], 0],
    ["10 − 4 = ?", ["6", "5", "7"], 0], ["Metade de 30?", ["10", "15", "20"], 1],
    ["9 × 9 = ?", ["72", "81", "99"], 1], ["100 ÷ 4 = ?", ["20", "25", "50"], 1],
    ["Quantos lados tem um hexágono?", ["5", "6", "8"], 1], ["7 + 8 = ?", ["14", "15", "16"], 1]
  ]},
  ciencias: { nome: "CIÊNCIAS", q: [
    ["Maior planeta do sistema solar?", ["Terra", "Júpiter", "Marte"], 1],
    ["Água ferve a quantos °C?", ["50", "100", "200"], 1],
    ["Gás que respiramos para viver?", ["Oxigênio", "Hélio", "Carbono"], 0],
    ["Planeta chamado de vermelho?", ["Vênus", "Marte", "Saturno"], 1],
    ["A planta produz alimento por...", ["Fotossíntese", "Digestão", "Evaporação"], 0],
    ["Qual órgão bombeia o sangue?", ["Pulmão", "Coração", "Fígado"], 1],
    ["Estado da água no gelo?", ["Sólido", "Líquido", "Gasoso"], 0],
    ["A Terra gira em torno do...", ["Sol", "Lua", "Marte"], 0]
  ]},
  portugues: { nome: "PORTUGUÊS", q: [
    ["Plural de “pão”?", ["pães", "pãos", "pões"], 0],
    ["Qual palavra está correta?", ["Exceção", "Esceção", "Exeção"], 0],
    ["Antônimo de “alto”?", ["Baixo", "Grande", "Forte"], 0],
    ["Sinônimo de “feliz”?", ["Triste", "Contente", "Bravo"], 1],
    ["Plural de “cidadão”?", ["cidadões", "cidadãos", "cidadães"], 1],
    ["Qual é um substantivo?", ["Correr", "Escola", "Rápido"], 1],
    ["Qual frase tem acento correto?", ["Ele está aqui", "Ele esta aqui", "Ele êsta aqui"], 0],
    ["Feminino de “aluno”?", ["Aluna", "Alunia", "Alunoa"], 0]
  ]},
  geografia: { nome: "GEOGRAFIA", q: [
    ["Capital do Brasil?", ["Rio de Janeiro", "Brasília", "Salvador"], 1],
    ["Maior oceano do mundo?", ["Atlântico", "Pacífico", "Índico"], 1],
    ["Rio mais extenso do Brasil?", ["Amazonas", "São Francisco", "Tietê"], 0],
    ["Em que continente fica o Brasil?", ["Europa", "América do Sul", "África"], 1],
    ["Capital de Minas Gerais?", ["Belo Horizonte", "Uberaba", "Ouro Preto"], 0],
    ["Quantos continentes existem?", ["5", "6", "7"], 2],
    ["Maior país do mundo em área?", ["China", "Rússia", "Canadá"], 1],
    ["Linha que divide a Terra em norte e sul?", ["Equador", "Trópico", "Meridiano"], 0]
  ]},
  geral: { nome: "CONHECIMENTOS GERAIS", q: [
    ["Dias de uma semana?", ["5", "6", "7"], 2],
    ["Meses de um ano?", ["10", "12", "13"], 1],
    ["Quantas cores tem o arco-íris?", ["5", "7", "9"], 1],
    ["Quem pintou a Mona Lisa?", ["Da Vinci", "Picasso", "Portinari"], 0],
    ["Esporte da Copa do Mundo?", ["Vôlei", "Futebol", "Natação"], 1],
    ["Onde guardamos livros?", ["Biblioteca", "Cozinha", "Garagem"], 0],
    ["Quantas horas tem um dia?", ["12", "24", "48"], 1],
    ["Qual animal faz “miau”?", ["Cão", "Gato", "Vaca"], 1]
  ]}
};
// Matéria de cada fase (na ordem de LEVELS); "mix" sorteia de todas
window.LEVEL_SUBJECTS = ["matematica", "geral", "portugues", "ciencias", "portugues", "geografia", "mix"];
