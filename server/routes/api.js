const express = require('express')
const router = express.Router()

const bcrypt = require('bcrypt')
const { Client } = require('pg')

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  password: 'WebTeam',
  database: 'projetLucioles'
})

client.connect()

module.exports = router

//Start of admin part
router.get('/admin/me', async (req, res) => {
  if(req.session.admin === true){
    res.json({admin: true})
    return
  }
  res.json({admin: false})
})

router.post('/admin/login', async (req, res) => {
  const email = req.body.email
  const password = req.body.password
  const sql = "SELECT * FROM admins WHERE email=$1"
  const result = await client.query({
    text: sql,
    values: [email]
  })

  if(result.rowCount === 0){
    res.status(401).json({ message: 'User does not already exist, please register first.'})
    return
  }

  if (! await bcrypt.compare(password, result.rows[0].password)){
    res.status(401).json({message: 'Wrong password'})
    return
  }

  req.session.adminId = result.rows[0].id
  req.session.admin = true
  
  res.json({connected: true, message: 'You are now logged in as an admin.'})
})

//admin management
router.post('/admin/register', async (req, res) =>{
  if (req.session.admin === true){
    const email = req.body.email
    const password = req.body.password

    var sql = "SELECT * FROM admins WHERE email=$1"
    var result = await client.query({
      text: sql,
      values: [email] // ici name et description ne sont pas concaténées à notre requête
    })

    if(result.rowCount !== 0){
      res.status(401).json({ message: 'Admin already exist'})
      return
    }

    const hash = await bcrypt.hash(password, 10)

    sql = "INSERT INTO admins (email, password) VALUES ($1, $2)"
    result = await client.query({
      text: sql,
      values: [email, hash]
    })

    result = await client.query({text: "SELECT id, email FROM admins"})
    res.json(result.rows)
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.delete('/admin/:id', async (req, res) => {
  if (req.session.admin === true){
    const deleteAdmin = req.params.id
    if (deleteAdmin == req.session.adminId){
      res.status(401).json({message: "You can't delete the current admin"})
      return
    }
    const sql = "DELETE FROM admins WHERE id=$1"
    var result = await client.query({
      text: sql,
      values: [deleteAdmin]
    })

    result = await client.query({text: "SELECT id, email FROM admins"})
    res.json(result.rows)
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.get('/admin/admins', async (req, res) =>{
  if (req.session.admin === true){
    const result = await client.query({text: "SELECT id, email FROM admins"})
    res.json({currentId: req.session.adminId, administrateurs: result.rows})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.get('/admin/users', async (req, res) =>{
  if (req.session.admin === true){
    var result = await client.query({text: "SELECT * FROM participants"})
    var data = result.rows
    console.log(result)
    console.log(data)
    for (var i = 0; i < data.length; i++){
      data[i].maraudes = []
      const sql = "SELECT nom_maraude, jour, mois, annee, maraude_id FROM maraudes WHERE maraude_id=$1"
      for (var j = 0; j < data[i].participations.length; j++){
        console.log(data[i].participations[j])
        result = await client.query({
          text: sql,
          values: [data[i].participations[j]],
        })
        console.log(result)
        data[i].maraudes.push(result.rows[0])
      }
    }
    res.json(data)
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.delete('/admin/user/:id', async (req, res) => {
  if (req.session.admin === true){
    const id = req.params.id
    const sql = "DELETE FROM participants WHERE id=$1"
    await client.query({
      text: sql,
      values: [id],
    })
    res.json({message: "Utilisateur supprimé."})
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

//Maraudes management
router.post('/admin/maraude', async (req, res) => {
  if (req.session.admin === true){
    const jour = req.body.jour
    const mois = req.body.mois
    const annee = req.body.annee
    const heure = req.body.heure
    const trajet = req.body.trajet
    const nbParticipants = req.body.nbParticipants
    const nom = req.body.nom
    
    const sql = "INSERT INTO maraudes (jour, mois, annee, heure, type, nombre_participants, nombre_volontaires, nom_maraude, participants) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
    await client.query({
      text: sql,
      values: [jour, mois, annee, heure, trajet, nbParticipants, 0, nom, "{}"]
    })
    res.json({message: "Maraude créé."})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.put('/admin/maraude', async (req, res) => {
  if (req.session.admin === true){
    const jour = req.body.jour
    const mois = req.body.mois
    const annee = req.body.annee
    const heure = req.body.heure
    const trajet = req.body.trajet
    const nbParticipants = req.body.nbParticipants
    const nom = req.body.nom
    const id = req.body.id
    const sql = "UPDATE maraudes\nSET jour=$1, mois=$2, annee=$3, heure=$4, type=$5, nombre_participants=$6, nom_maraude=$7 WHERE maraude_id=$8"
    
    await client.query({
      text: sql,
      values: [jour, mois, annee, heure, trajet, nbParticipants, nom, id]
    })
    
    res.json({message: "Maraude modifiée."})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.delete('/admin/maraude/:id', async (req, res) => {
  if (req.session.admin === true){
    const deleteMaraude = req.params.id
    const sql = "DELETE FROM maraudes WHERE maraude_id=$1"
    const result = await client.query({
      text: sql,
      values: [deleteMaraude]
    })
    
    res.json({message: "Maraude supprimée."})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.get('/admin/maraudesUtilisateurs', async (req, res) =>{
  if (req.session.admin === true){    
    var result = await client.query({text: "SELECT * FROM maraudes\nORDER BY annee, mois, jour"})
    for(var i = 0; i < result.rowCount; i++){
      for(var j = 0; j < result.rows[i].participants.length; j++){
        const sql = "SELECT id, nom, prenom, email, telephone FROM participants WHERE id = $1"
        var result2 = await client.query({
          text: sql,
          values: [result.rows[i].participants[j]]
        })
        console.log({i: i, participants: result.rows[i].participants, result: result2.rows})
        result.rows[i].participants[j] = result2.rows[0]
      }
    }
    res.json(result.rows)
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.post('/admin/trajet', async (req, res) => {
  if (req.session.admin === true){    
    const nom = req.body.nom
    const depart = req.body.depart
    const arrivee = req.body.arrivee
    const trajet = req.body.trajet
    console.log({trajet: trajet})
    const sql = "INSERT INTO trajets (nom_trajet, depart, arrivee, trajet) VALUES ($1, $2, $3, $4)"
    await client.query({
      text: sql,
      values: [nom, depart, arrivee, trajet]
    })
    res.json({message: "Trajet créé."})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

router.post('/admin/doleance', async (req, res) =>{
  if (req.session.admin === true){
    objet = req.body.objet,
    description = req.body.description,
    lieu = req.body.lieu,
    trajet = req.body.trajet

    if (lieu == null){
      res.json({message: "Une position est necessaire."})
      return
    }
    const sql = "INSERT INTO doleances (objet, description, lieu, trajet_associe) VALUES ($1, $2, $3, $4)"
    await client.query({
      text: sql,
      values: [objet, description, lieu, trajet],
    })
    res.json({message: "Doleance enregistrée."})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
  
})

router.delete('/admin/doleance/:id', async (req, res) =>{
  
  if (req.session.admin === true){
    console.log("Inside if")
    const doleance = req.params.id
    console.log({id: doleance})
    const sql = "DELETE FROM doleances WHERE id=$1"
    const result = await client.query({
      text: sql,
      values: [doleance]
    })
    
    res.json({message: "Doleance supprimée."})
    return
  }
  res.status(400).json({message: "L'utilisateur n'a pas les droits administrateurs."})
})

//End of admin part

router.get('/maraudes', async (req, res) => {
  const today = new Date()
  //TODO changer requete pour pas afficher anciennes maraudes
  const result = await client.query({text: "SELECT * FROM maraudes\nORDER BY annee, mois, jour"})
  res.json(result.rows)
  return
})

router.get('/maraudesTrajets', async(req, res) => {
  const result = await client.query({text: "SELECT * FROM maraudes\nINNER JOIN trajets ON maraudes.type=trajets.trajet_id\nORDER BY maraudes.annee, maraudes.mois, maraudes.jour"})
  res.json(result.rows)
  console.log(result.rows)
})

router.get('/maraude/:id', async (req,res) => {
  const sql = "SELECT *\nFROM maraudes\nINNER JOIN trajets ON maraudes.type=trajets.trajet_id AND maraudes.maraude_id=$1"
  const maraudeId = req.params.id
  console.log(sql)
  console.log(maraudeId)
  const result = await client.query({
    text: sql,
    values: [maraudeId]
  })
  console.log(result)
  res.json(result.rows)
})

router.get('/trajets', async (req, res) => {
  const result = await client.query({text: "SELECT * FROM trajets"})
  res.json(result.rows)
  return
})

router.post('/email', async (req, res) => {
  const maraudeId = req.body.id
  const placesRestantes = await isFull(maraudeId)
  
  console.log({placesRestantes: placesRestantes})

  if(placesRestantes == false){
    res.json({message: "Limite de participants atteinte."})
    return
  }

  const email = req.body.email

  if (!email.match(/[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i)) {
    res.json({message: "Le format de l'adresse mail n'est pas valide. Veuillez entrer une adresse amil valide."})
  }

  const participantID = await getIdParticipant(email)
  if(participantID === false){
    res.json({connu: false, message: "Participant non inscrit."})
    return
  }
  var sql = "SELECT participations FROM participants WHERE id=$1"
  const result = await client.query({
    text: sql,
    values: [participantID]
  })
  console.log({result: result.rows[0].participations})

  console.log(maraudeId)

  for(var i = 0; i < result.rows[0].participations.length; i++){
    if(result.rows[0].participations[i] == maraudeId){
      res.json({connu: true, message: "Participant déja inscrit."})
      return
    }
  }

  sql = "UPDATE participants SET nombre_participations = nombre_participations + 1, participations = array_append(participations, $1) WHERE email = $2"
  await client.query({
    text: sql,
    values: [maraudeId, email]
  })
  await inscriptionMaraude(participantID, maraudeId)
  res.json({connu: true, message: "Participant inscrit."})
})

router.post('/participant', async (req, res) => {
  const maraudeId = req.body.id
  
  const placesRestantes = await isFull(maraudeId)

  console.log({placesRestantes: placesRestantes})

  if(placesRestantes == false){
    res.json({message: "Limite de participants atteinte."})
    return
  }

  const email = req.body.email

  var sql = "SELECT id FROM participants WHERE email = $1"
  var result = await client.query({
    text: sql,
    values: [email]
  })
  if(result.rowCount !== 0){
    res.json({message: "L'adresse mail est déjà utilisée."})
    return
  }
  const nom = req.body.nom
  const prenom = req.body.prenom
  const telephone = req.body.phone
  console.log(typeof maraudeId)
  sql = "INSERT INTO participants (nom, prenom, email, telephone, participations, nombre_participations) VALUES ($1, $2, $3, $4, $5, $6)"
  await client.query({
    text: sql,
    values: [nom, prenom, email, telephone, "{"+maraudeId+"}", 1]
  })
  console.log("done")

  const participantID = await getIdParticipant(email)
  await inscriptionMaraude(participantID, maraudeId)
  res.json({message: "Participant enregistré et inscrit"})
})

async function inscriptionMaraude(participantId, maraudeId){
  console.log(participantId)
  
  sql = "UPDATE maraudes SET nombre_volontaires = nombre_volontaires + 1, participants = array_append(participants, $1) WHERE maraude_id = $2"
  await client.query({
    text: sql,
    values: [participantId, maraudeId]
  })
}

async function isFull(maraudeId){
  const sql = "SELECT nombre_participants, nombre_volontaires FROM maraudes WHERE maraude_id = $1"
  const result = await client.query({
    text: sql,
    values: [maraudeId],
  })
  console.log({isFull: result.rows})
  if(result.rows[0].nombre_participants <= result.rows[0].nombre_volontaires){
    console.log({return: false})
    return false
  }
  return true
}

async function getIdParticipant(email){
  const sql = "SELECT id FROM participants WHERE email = $1"
  const result = await client.query({
    text: sql,
    values: [email]
  })
  if (result.rowCount === 0){
    return false
  }
  return result.rows[0].id
}

router.get('/doleances', async (req, res)=> {
  const result = await client.query({text: "SELECT doleances.id, doleances.lieu, doleances.coordonnees, doleances.objet, doleances.description, trajets.nom_trajet FROM doleances, trajets WHERE (trajets.trajet_id = doleances.trajet_associe)"})
  res.json(result.rows)
  return
})

