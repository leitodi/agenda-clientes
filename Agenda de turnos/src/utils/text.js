const ACCENTED_CHARS_MAP = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u',
    Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U'
};

function removeAccents(value) {
    return String(value || '').replace(/[áéíóúüÁÉÍÓÚÜ]/g, (char) => ACCENTED_CHARS_MAP[char] || char);
}

module.exports = {
    removeAccents
};
