import { Button, Platform, ScrollView, StyleSheet } from "react-native";

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
  const [transcribes, setTranscribes] = useState<any[]>([]);
  const [ounter, setCounter] = useState<number>(0);

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
    if (onGoingRecord) {
      stopRecording();
      setOnGoingRecord(false);
    } else {
      setOnGoingRecord(true);
    }
  }
  if (onGoingRecord) {
    if (recording === undefined) {
      startRecording();
    } else {
      setTimeout(stopRecording, 30000);
    }
  }
useEffect(()=>{

  listAll(listRef)
    .then((res: any) => {
      res.items.forEach((itemRef: any) => {
        getDownloadURL(ref(storage, itemRef._location.path_)).then((url) => {
          transcribeAudio({ url: url })
            .then(async(result) => {
              console.log(result.data);
              if (transcribes?.transcription !== `${await result.data?.transcribes}` && await result.data !== 0) {
               
                transcribes.push({
                  transcription: await result.data?.transcribes,
                  gpt_res: await result.data?.gpt_res,
                });
                
              }
              // if (!(JSON.stringify(transcribes).includes(JSON.stringify(result.data)))) {
              //   // console.log(transcribes.findIndex(result.data!))
              //   transcribes.push(result.data);
              // }
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
},[listRef])

  // console.log("transcribe: ", transcribes);
  // console.log("gpt:", gptRes);

  function getDurationFormatted(milliseconds: number) {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10
      ? `${Math.floor(minutes)}:0${seconds}`
      : `${Math.floor(minutes)}:${seconds}`;
  }

  const unique = transcribes.filter((obj, index) => {
    if(obj.transcription!== undefined){
      return index === transcribes.findIndex(o => obj.transcription === o.transcription );
    }
  });
  // setTimeout(() => {
  //   setTranscribes([...unique])
  // }, 120000);
  // console.log("unniq:",unique);
  function getRecordingLines() {
    return <ScrollView style={styles.scrollView}>
      {unique.map((transcribe: string, index: number) => {  
        return (
          <View key={index}>  
              <Text key={index} style={styles.fill}>
                <Text style={{ fontWeight: "bold" }}> Transcirptions:</Text>
                {transcribe?.transcription}
              </Text>
               
              <Text style={styles.fill}>
                <Text style={{ fontWeight: "bold" }}> GPT Response:</Text>
                {transcribe?.gpt_res}
              </Text>
          </View>
        );
      })}
    </ScrollView>
  }


  function clearRecordings() {
    setTranscribes([]);
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
      {transcribes.length > 0 ? (
        <View style={styles.Button}>
          <Button title={"Clear Transcribes"}  onPress={clearRecordings}  />
        </View>
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
    marginBottom:12 ,
    marginHorizontal:10,
    textAlign: "left"
  },scrollView: {
    paddingTop:15,
    marginHorizontal: 20,
  },
  Button:{
    marginBottom:10
  }
});
