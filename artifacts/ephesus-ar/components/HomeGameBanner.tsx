import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Decorative branding only; game navigation and economy stay in HomeScreen. */
export default function HomeGameBanner() {
  return (
    <View style={styles.card} testID="home-game-banner">
      <ImageBackground source={require('../assets/images/red-zone-soldier-hero.png')} style={styles.art} resizeMode="cover" accessible={false}>
        <LinearGradient colors={['rgba(5,15,13,0.25)', 'transparent', '#07120F']} style={StyleSheet.absoluteFill} />
        <Image
          source={require('../assets/images/home-soldier-silhouette.png')}
          style={styles.soldier}
          resizeMode="contain"
          accessible={false}
        />
        <View style={styles.copy}>
          <Text style={styles.studio}>EPHESUS MEDYA</Text>
          <Text style={styles.title}>RED{'\n'}ZONE <Text style={styles.ar}>AR</Text></Text>
          <View style={styles.line} />
        </View>
      </ImageBackground>
      <View style={styles.credit}>
        <Text style={styles.label}>GELİŞTİRİCİ</Text>
        <Text style={styles.name}>HALİL ÖZSOY</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#33443B', backgroundColor: '#07120F' },
  art: { height: 180, justifyContent: 'center' },
  soldier: { position: 'absolute', zIndex: 1, width: 158, height: 178, right: -2, bottom: -4, opacity: 1 },
  copy: { zIndex: 2, width: '58%', paddingHorizontal: 20, paddingTop: 10, alignItems: 'flex-start' },
  studio: { color: '#D6B577', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#FF493E', fontSize: 37, lineHeight: 39, fontWeight: '900', letterSpacing: 1, marginTop: 12, textShadowColor: '#000', textShadowRadius: 8 },
  ar: { color: '#F3EEE2', fontSize: 24 },
  line: { width: 35, height: 3, backgroundColor: '#FF493E', marginTop: 12 },
  credit: { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  label: { color: '#99ABA2', fontSize: 8, fontWeight: '700', letterSpacing: 1.5 },
  name: { color: '#F3EEE2', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
});