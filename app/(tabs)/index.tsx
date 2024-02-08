import { Button, Platform, StyleSheet } from "react-native";

import {
  getDownloadURL,
  getStorage,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";
import { Text, View } from "@/components/Themed";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { app } from "@/FirebaseCofig";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
const bucketLocation: string = "gs://transcription-d9c70.appspot.com";
const storage = getStorage(app, bucketLocation);

const functions = getFunctions();
connectFunctionsEmulator(functions, "10.0.2.2", 5001);
const transcribeAudio = httpsCallable(functions, "transcribeAudio");

export default function TabOneScreen() {
  const fetch = require("cross-fetch");
  const [onGoingRecord, setOnGoingRecord] = useState<boolean>(false);
  const [recording, setRecording] = useState<any>(undefined);
  const [recordings, setRecordings] = useState<any>([]);
  const [transcribes, setTranscribes] = useState<string[]>([]);
  const [gptRes, setGptRes] = useState<string[]>([]);

  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const listRef = ref(storage, bucketLocation);


  async function startRecording() {
    try {
      if (permissionResponse?.status !== "granted") {
        console.log("Requesting permission..");
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    setRecording(undefined);

    await recording?.stopAndUnloadAsync();
    let allRecordings = [...recordings];
    const { sound, status } = await recording?.createNewLoadedSoundAsync();
    allRecordings.push({
      sound: sound,
      duration: getDurationFormatted(status.durationMillis),
      file: recording.getURI(),
    });
    // FILE UPLOAD TO FIREBASE
    const response = await fetch(recording.getURI());
    const file = await response.blob();
    const filename = recording
      .getURI()
      .substring(recording.getURI().lastIndexOf("/") + 1);
    const audioRef = ref(storage, filename);
    // const snapshot = await uploadBytes(audioRef, filename)

    uploadBytes(audioRef, file).then((snapshot) => {
      console.log("Uploaded a blob or file!");
    });
    setRecordings(allRecordings);
  }
  function toggleRecording() {
    onGoingRecord ? setOnGoingRecord(false) : setOnGoingRecord(true);
  }
  if(!onGoingRecord){
    stopRecording
  }
  if (onGoingRecord) {
    if (recording === undefined) {
      startRecording()
    }
    else { 
      setTimeout(stopRecording, 10000);
    }
  }
  
    listAll(listRef)
      .then((res: any) => {
        res.items.forEach((itemRef: any) => {
          getDownloadURL(ref(storage, itemRef._location.path_)).then((url) => {
            transcribeAudio({ url: url })
              .then((result) => {
                // console.log(result.data);
                if(!transcribes.includes(`${result.data.transcribes}`)||gptRes.includes(`${result.data.gpt_res}`)){
                  transcribes.push(`${result.data.transcribes}`);
                  gptRes.push(`${result.data.gpt_res}`);
                }

              })
              .catch((error) => {
                // Getting the Error details.
                console.error("Error calling the function", error);
              });
          });
          // const desertRef = ref(storage, );
          // Hello. How are you? //I am fine. Thank you. How are you? I am good.

        });
      })
      .catch((error) => {
        // Uh-oh, an error occurred!
        throw error;
      });


  console.log("transcribe: ",transcribes);
  console.log("gpt:",gptRes);

  function getDurationFormatted(milliseconds: number) {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10
      ? `${Math.floor(minutes)}:0${seconds}`
      : `${Math.floor(minutes)}:${seconds}`;
  }

  function getRecordingLines() {
    return transcribes.map((transcribe: string, index: number) => {
      return (
        <View key={index} style={styles.row}>
          <Text style={styles.fill}>
            <Text style={{fontWeight:"bold"}}> Transcirbes:</Text>
            {transcribe}
          </Text>
        </View>
      );
    });
  }
  function getGPTresponse() {
    return gptRes.map((res: string, index: number) => {
      return (
        <View key={index} style={styles.row}>
          <Text style={styles.fill}>
            <Text style={{fontWeight:"bold"}}> GPT Response:</Text>
            {res}
          </Text>
        </View>
      );
    });
  }

  function clearRecordings() {
    setTranscribes([]);
    setGptRes([]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transcirbe Your Voice</Text>
      <View
        style={styles.separator}
        lightColor="#aae"
        darkColor="rgba(255,255,255,0.1)"
      />
      <Button
        title={onGoingRecord ? "Stop Transcribing" : "Start Transcribing"}
        onPress={toggleRecording}
      />
      {getRecordingLines()}
      {getGPTresponse()}
      {transcribes.length > 0 ? (
        <Button title={"Clear Transcribes"} onPress={clearRecordings} />
      ) : (
        <View />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    marginRight: 40,
  },
  fill: {
    flex: 1,
    margin: 15,
  },
});
