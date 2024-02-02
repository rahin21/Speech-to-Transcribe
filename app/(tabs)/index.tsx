import { Button, NativeEventEmitter, StyleSheet } from "react-native";
import {
  CreateProjectKeyResponse,
  LiveClient,
  LiveTranscriptionEvents,
  createClient,
} from "@deepgram/sdk";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { Text, View } from "@/components/Themed";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { app } from "@/FirebaseCofig";
const storage = getStorage(app,"gs://transcription-d9c70.appspot.com");
import * as FileSystem from 'expo-file-system'

export default function TabOneScreen() {
  const fetch = require("cross-fetch");
  const eventEmitter = new NativeEventEmitter();
  const [recording, setRecording] = useState<any>();
  const [recordings, setRecordings] = useState<any>([]);
  const [key, setKey] = useState<any>([]);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [apiKey, setApiKey] = useState<CreateProjectKeyResponse | null>();
  const [connection, setConnection] = useState<LiveClient | null>();
  const [caption, setCaption] = useState<string | null>();
  const [isListening, setListening] = useState(false);
 
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
    
    const response = await fetch(recording.getURI());
    const file = await response.blob();
    const filename = recording.getURI().substring(recording.getURI().lastIndexOf('/')+1);
    const audioRef = ref(storage, filename);
    const snapshot = await uploadBytes(audioRef, filename)
// console.log(recording)
// console.log(audioRef)
    uploadBytes(audioRef, file).then((snapshot) => {
      console.log('Uploaded a blob or file!');
    });
    setRecordings(allRecordings);
  }

  function getDurationFormatted(milliseconds: number) {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10
      ? `${Math.floor(minutes)}:0${seconds}`
      : `${Math.floor(minutes)}:${seconds}`;
  }

  function getRecordingLines() {
    return recordings.map((recordingLine: any, index: number) => {
      return (
        <View key={index} style={styles.row}>
          <Text style={styles.fill}>
            Recording #{index + 1} | {recordingLine.duration}
          </Text>
          <Button
            onPress={async () => await recordingLine.sound.replayAsync()}
            title="Play"
          ></Button>
        </View>
      );
    });
  }
  

  function clearRecordings() {
    setRecordings([]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record Audio</Text>
      <View
        style={styles.separator}
        lightColor="#aae"
        darkColor="rgba(255,255,255,0.1)"
      />
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
      {getRecordingLines()}
      {recordings.length > 0 ? (
        <Button title={"Clear Recordings"} onPress={clearRecordings} />
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
