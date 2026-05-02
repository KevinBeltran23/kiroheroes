import { getDownloadURL, getStorage, ref } from '@react-native-firebase/storage';
import { Platform } from 'react-native';

const storage = getStorage();

export interface UploadedSessionVideo {
  url: string;
  path: string;
  type: 'video';
  name: string;
}

export async function uploadSessionVideo(input: {
  uri: string;
  userId: string;
  sessionId: string;
}): Promise<UploadedSessionVideo> {
  const filePath =
    Platform.OS === 'android' ? input.uri : input.uri.replace('file://', '');
  const extension = input.uri.split('.').pop()?.split('?')[0] || 'mov';
  const fileName = `raw-${Date.now()}.${extension}`;
  const uploadPath = `users/${input.userId}/sessions/${input.sessionId}/raw/${fileName}`;
  const storageRef = ref(storage, uploadPath);

  await storageRef.putFile(filePath);
  const url = await getDownloadURL(storageRef);

  return {
    url,
    path: uploadPath,
    type: 'video',
    name: fileName,
  };
}
