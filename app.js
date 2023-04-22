function getRandom(arr) {
	return arr[Math.floor(arr.length*Math.random())]
}

window.onload = function(e) { 

	// INITIALIZE FIREBASE
	// If we initialize it out here, then everythong below has access to "db"
	console.log("CONNECTING TO FIREBASE")
	
	// Your web app's Firebase configuration
	// DO NOT USE THIS ONE FOR YOUR ASSIGNMENT, MAKE YOUR OWN
	// I WILL DEDUCT POINTS IF I SEE YOU USE THIS ONE 
	// It's ok for this to be public! Its visible in any web page
    const firebaseConfig = {
      apiKey: "AIzaSyDwaxVZb_euf7cFaFgZJw2EAd_cM-a-kX4",
      authDomain: "cs-396-arvr-a2.firebaseapp.com",
      projectId: "cs-396-arvr-a2",
      storageBucket: "cs-396-arvr-a2.appspot.com",
      messagingSenderId: "725442144928",
      appId: "1:725442144928:web:f117ec01779691d06bb7c5",
      measurementId: "G-G6T8VYRL2C"
    };

	try {
		// Initialize Firebase
		firebase.initializeApp(firebaseConfig);
		console.log("FIREBASE INIT!")
		  
	} catch (err) {
		console.warn("Can't connect to firebase")
	}

	//  MAKE THE DATABASE
	const db = firebase.database()

    // Static Room ID
    const roomId = "1234";

	//------------------------------------------
	// Create a new Vue object
	
	new Vue({
		template: `<div id="app"> 

			<div class="column">
				<div class="game-info">
					{{gameState}}

                    <div> Living Players: {{livingPlayers.length}}</div>
                    <div> Eliminated Players: {{eliminatedPlayers.length}}</div>
                    <div> Timer: <span>{{ time }}</span></div>
					<div> Game Round: <span>{{ gameRound }}</span></div>

				</div>
				
				<!-- a table of current players -->
				<table class="player-table">
					<td>PLAYERS</td>
					<tr v-for="player in players" :class="{user:isMe(player)}">
						<td>{{player.name}}</td>
						<td>{{player.status}}</td>
					</tr>

				</table>

                <div class="button">
                    <button @click="pressButton">BUTTON</button>
                </div>

			</div>

			<div class="column">
				<div class="controls">
					<!-- Name change -->
					<div v-if="user">
						<input v-model="user.name" size=10  />
						<input v-model="user.emoji" maxlength='2' size=2 />
					</div>

					<!-- Join buttons -->
					<button @click="joinGame" v-if="!joined">join</button>
					<button @click="exitGame" v-else>exit</button>

					<!-- Game-start buttons -->
					<div v-if="joined">
						<button @click="startGame" :disabled="!canStartGame">start game</button>
						<span v-if="!canStartGame">
							You need at least {{minPlayers}} to start a game
						</span>
					</div>
                    <div>
                        <button @click="resetGame">Reset Game</button>
                    </div>
					<div>
					<button @click="resetPlayers">Reset Players</button>
					</div>
				</div>

				<div class="event-log">
					<div v-for="event in eventsToShow">
						{{event}}
					</div>
				</div>
			</div>
		</div>`,

		computed: {
			//-----------------------------------
			// Computed networking stuff
			user() {
				return this.players[this.userKey]
			},

			eventsToShow() {
				return this.eventLog.slice().reverse()
			},

			joined() {
				return this.userKey
			},

			canStartGame() {
				return Object.keys(this.players).length >= this.minPlayers
			},

            livingPlayers() {
                return Object.values(this.players).filter(player => player.status === "alive");
              },

              eliminatedPlayers() {
                return Object.values(this.players).filter(player => player.status !== "alive");
              },

              time() {
                if (this.timeRemaining === null) {
                    const seconds = 5;
                    const milliseconds = 00;
                    return `${seconds}:${milliseconds.toString().padStart(2, '0')}`;
                  }
                const seconds = Math.floor(this.timeRemaining / 1000);
                const milliseconds = this.timeRemaining % 1000;
                return `${seconds}:${milliseconds.toString().padStart(2, '0')}`;
              },

		},

		methods: {
			isMe(player) {
				// Is this player me, the user?
				return this.userKey === player.key
			},

			exitGame() {
				// Leave the current game

				// Set the user's playerRef to null
				this.playersRef.child(this.userKey).set(null)
				
				// Erase our key (bc we are no longer in the players ref)
				this.userKey = undefined
			},

			joinGame() {
				// Add this player to firebase, when we want to

				// A reference for *this* user
				// add them to the players, and set to the current user
				const userRef = this.playersRef.push()
				
				// Remember the key we got
				this.userKey = userRef.key
				
				const nameOptions = "1 2 3 4 5 6 7 8 9 10".split(" ")
			
				userRef.set({

					name: getRandom(nameOptions),
					status: "alive",
					key: this.userKey,

				})

				console.log("Joined room with UID", this.userKey)

				// When we leave this room, remove this player
				userRef.onDisconnect().set(null)
			},

			pushPlayerUpdateToFirebase(player) {
				// // Tell the database about a change to this player

				// Skip any player (like the user) that doesn't have a key yet
				if (player && player.key) {
					console.log(this.user.name + ": Tell firebase about changes in player", 
						player.name, player.emoji, player)

					// Get the reference for this player
					// it is a CHILD of our players ref
					this.playersRef.child(player.key).set(player)
				}
			},
      
      // Send an event to the eventlog
			postToEventLog(text) {
				let eventRef = this.eventLogRef.push()
				eventRef.set(text)
			},
      
			//-----------------------------------
			// Game methods

			isDead(player) {
				return player.status === "dead";
			},

			isAlive(player) {
			return player.status === "alive";
			},

			resetPlayers() {
				const playersRef = db.ref("button-game/players");
				playersRef.remove()
					.then(() => {
						this.postToEventLog("All players have been deleted.");
					})
					.catch((error) => {
						this.postToEventLog("Error deleting all players.");
					});
			},
				
			resetGame() {
                this.eventLogRef.set(null);
                this.gameState ="notStarted"
				const gameStateRef = db.ref("button-game/gameState");
				gameStateRef.set("notStarted");

				this.gameRound = 0;
				const gameRoundRef = db.ref("button-game/gameRound");
				gameRoundRef.set(0);

				const timerStartedRef = db.ref("button-game/timerStarted");
				timerStartedRef.set(false);

                const playersRef = db.ref("button-game/players");
                playersRef.once("value").then(snapshot => {
                    snapshot.forEach(childSnapshot => {
                        const playerKey = childSnapshot.key;
                        const playerRef = db.ref(`button-game/players/${playerKey}`);
                        playerRef.update({
                            status: "alive"
                        });
                    });
                });
                this.postToEventLog(this.user.name + " cleared the event log");
                this.postToEventLog(this.user.name + " reset the game");
              },

            startGame() {
				this.gameRound += 1;
                //Set timer
                if (this.timeRemaining === null) {
                    this.timeRemaining = 5000; // set to desired time value
                  }
                this.postToEventLog(this.user.name + " starts a new game")
                this.gameState = "active";

				// Set the initial timer value in the Realtime Database and start timer
				const timerStartedRef = db.ref("button-game/timerStarted");
				timerStartedRef.set(true);

				const timerRef = db.ref("button-game/timer");
				timerRef.set(this.timeRemaining);

				// Start updating the timer value in the Realtime Database
				const countdown = setInterval(() => {
					this.timeRemaining -= 10;
					if (this.timeRemaining <= 0) {
						clearInterval(countdown);
						if (this.gameState === "active") {
							this.endGame(); // Game is over when timer runs out
						}
					} else {
						timerRef.set(this.timeRemaining);
					}
				}, 10); // update every 10 milliseconds
  

                const gameStateRef = db.ref("button-game/gameState");
                gameStateRef.set("active");

				//const timerRef = db.ref("button-game/timer");
				const gameRoundRef = db.ref("button-game/gameRound");
				gameRoundRef.set(this.gameRound);

                this.timerStarted = true;
            },
              
            pressButton() {
                //Only works if gamestate is active
                if (this.gameState !== "active") {
                    return;
                }

                const timeRef = db.ref(`button-game/players/${this.userKey}/timestamp`);
                timeRef.set(firebase.database.ServerValue.TIMESTAMP);

				const roundRef = db.ref(`button-game/players/${this.userKey}/gameRound`);
				roundRef.set(this.gameRound);
            },

            orderedArray() {
                const buttonPressesRef = db.ref(`button-game/players`);
                return buttonPressesRef.once('value')
                    .then((snapshot) => {
                        const buttonPresses = [];
                        snapshot.forEach((childSnapshot) => {
							const key = childSnapshot.key;
							const buttonPress = childSnapshot.val();
							if (buttonPress.gameRound === this.gameRound) {
								buttonPresses.push({
								key,
								name: buttonPress.name,
								timestamp: buttonPress.timestamp,
								gameRound: buttonPress.gameRound
							});
						}
                    });
                    return buttonPresses.sort((a, b) => a.timestamp - b.timestamp);
                });
            },

            endGame() {
                this.gameState = "notStarted";

                // Call orderedArray and wait for it to resolve
                this.orderedArray().then(order => {
					// Eliminate players who didn't press the button
					order.forEach(player => {
						if (player.timestamp === null || player.gameRound !== this.gameRound) {
							const playerRef = db.ref(`button-game/players/${player.key}`);
							playerRef.update({ status: "dead" });
							this.postToEventLog(`${player.name} Eliminated! (Didn't press button)`);
						}
					});

					const alivePlayers = order.filter(player => player.status === "alive");

                    // Eliminate players
                    if (order.length >= 2) {
                        const firstPlayer = order[0].key;
                        const lastPlayer = order[order.length - 1].key;
                        const firstPlayerName = order[0].name;
                        const lastPlayerName = order[order.length - 1].name;

                        const firstUserRef = db.ref(`button-game/players/${firstPlayer}`);
                        firstUserRef.update({ status: "dead" });

                        const lastUserRef = db.ref(`button-game/players/${lastPlayer}`);
                        lastUserRef.update({ status: "dead" });

                        this.postToEventLog(`${firstPlayerName} has been Eliminated!`);
                        this.postToEventLog(`${lastPlayerName} has been Eliminated!`);
                    }

                    // Check for a winner. Set remainingPlayers = players who are alive
                    const remainingPlayers = order.filter(player => player.status === "alive");
            
                    if (remainingPlayers.length === 2) {
                        const firstPlayer = remainingPlayers[0][0];
                        const lastPlayer = remainingPlayers[1][0];
                        this.postToEventLog(`${firstPlayer} and ${lastPlayer} are tied!`);
                    }

                    if (remainingPlayers.length === 1) {
                        const lastPlayer = remainingPlayers[0][0];
                        this.postToEventLog(`${lastPlayer} Is the Winner!`);
                    }
                    else {
                        // Start a new round
                        this.gameState = "notStarted";
                        this.timeRemaining = null;

                        //Reset each player's timestamp
                        const playersRef = db.ref("button-game/players");
                        playersRef.once("value").then(snapshot => {
                        snapshot.forEach(childSnapshot => {
                            const playerKey = childSnapshot.key;
                            const playerRef = db.ref(`button-game/players/${playerKey}`);
                            playerRef.update({
                            timestamp: null // reset timestamp to null
                        });
                });
                })};
                });
            },				

		},

		// Which element Vue controls
		data() {
			
			return {

				// Turn this on to show yourself debug info while developing
				// Its hard to debug with secret information!
				debugMode: false,

				// Event logs help with debugging!
				eventLog: [],

				// Which player am I?
				userKey: undefined,
				players: {},
				
				// You need to have define your game data here so Vue can see it
				target: undefined,
				minPlayers: 3,
				gameState: "notStarted",

                // Button
                gameData: null,
                timeRemaining: null,

                //Timer
                timerStarted: false,
				gameRound: 0,
                
			}
		},


		watch: {
			"user.name"() {
				this.pushPlayerUpdateToFirebase(this.user)
			},

			"user.emoji"() {
				this.pushPlayerUpdateToFirebase(this.user)
			}
		},


		mounted() {
				//Subscribe to Game States/ Timers / Game Round / Timer Started
				const gameStateRef = db.ref("button-game/gameState");
				const timerRef = db.ref("button-game/timer");
				const gameRoundRef = db.ref("button-game/gameRound");

				const timerStartedRef = db.ref("button-game/timerStarted");
				timerStartedRef.on("value", (snapshot) => {
					this.timerStarted = snapshot.val();
				});

				gameStateRef.on("value", (snapshot) => {
					this.gameState = snapshot.val();
				});
			
				timerRef.on("value", (snapshot) => {
					this.timeRemaining = snapshot.val();
				});
			
				gameRoundRef.on("value", (snapshot) => {
					this.gameRound = snapshot.val();
				});
			

			//======================================================

			// SUBSCRIBE TO DATA
			// I like to keep all of my Firebase RTD code together

			// If you make a top-level object for this game, 
			// it will not conflict with other apps on the same firebase project
			// and later you can set it up to have multiple rooms instead

			let myGameRef = db.ref("button-game");
		
			//----------------------------
			// Subscribe to event list
			// We have code in two places: 
			// - here, to deal with listening to FB changes and copying them locally
			// - and in "methods" to use this.eventLogRef to push changes to the cloud

			// Get a child reference to something *inside* myGameRef
			this.eventLogRef = myGameRef.child("events")

			// When events are added
			this.eventLogRef.on("child_added", (snapshot) => {
				this.eventLog.push(snapshot.val())
			})

			// When events are erased
			this.eventLogRef.on("value", (snapshot) => {
				if (snapshot.val() == null) {
					//If the log was deleted, clear it here
					this.eventLog.splice(0, this.eventLog.length)
				}
			})
				
			//----------------------------
			// Subscribe to player list
			// We have code in two places: 
			// - here, to deal with listening to FB changes and copying them locally
			// - and in "methods" to use this.playersRef to push changes to the cloud

			// Keep a list in sync with a Firebase object
			// If we change something locally, add it to the Firebase object
			this.playersRef = myGameRef.child("players")
			
			// When we get a new player, add them to the player list
			this.playersRef.on("child_added", (snapshot) => {
				let playerData = snapshot.val()
				// Add this to our users
				Vue.set(this.players, snapshot.key, playerData)
				console.log("New player joined", playerData.name, playerData.emoji)
			})

			// When one of the players changes, listen to it
			this.playersRef.on("child_changed", (snapshot) => {
				let playerData = snapshot.val()

				// We need use Vue.set to update the info
				Vue.set(this.players, playerData.key, playerData)
				console.log("Player changed", playerData.name, playerData.emoji, playerData.role)
			})

			// When one of the players leaves, remove them from the player list
			this.playersRef.on("child_removed", (snapshot) => {
				let playerData = snapshot.val()

				Vue.delete(this.players, snapshot.key);
				console.log("Player left", snapshot.key, playerData)
			})		
            
		},

		el: "#app",

		
	})

	
}
