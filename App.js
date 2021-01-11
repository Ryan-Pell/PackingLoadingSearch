import React, { Component, useState } from 'react';
import { View, Image, ActivityIndicator, Alert, Dimensions, Text, StyleSheet, Vibration } from 'react-native';
import { ScrollView, TextInput, TouchableHighlight, TouchableOpacity } from 'react-native-gesture-handler';
import { Paragraph, Button } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Overlay, PricingCard } from 'react-native-elements';
import { BarCodeScanner, getPermissionsAsync } from 'expo-barcode-scanner'
import BarcodeMask from 'react-native-barcode-mask';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'react-native';
import Constants from 'expo-constants';
import { Linking } from 'react-native';
import * as Permissions from 'expo-permissions'
import * as Updates from 'expo-updates';
import Ping from 'react-native-ping';
import { set } from 'react-native-reanimated';

const Stack = createStackNavigator();
const ip = '192.168.17.6';
const host = `http://${ip}/api`;
const version = Constants.manifest.version;
var newVersionUrl = '';

export default function App() {
  const [isLoading, setLoading] = useState(true);
  const [requireUpdate, setRequireUpdate] = useState(false);

  const checkVersion = ((a, b)=>{
    let x = a.split('.').map(e => parseInt(e));
    let y = b.split('.').map(e => parseInt(e));
    let z = "";
  
    for (var i = 0; i < x.length; i++) {
      if (x[i] === y[i]) {
        z += "e";
      } else
        if (x[i] > y[i]) {
          z += "m";
        } else {
          z += "l";
        }
    }
    if (!z.match(/[l|m]/g)) {
      return 0;
    } else if (z.split('e').join('')[0] == "m") {
      return 1;
    } else {
      return -1;
    }
  })

  React.useEffect(() => { 
    //Using Expo Updates
    const fetchUpdate = async() => {
      var rtn = await Updates.checkForUpdateAsync();
      console.log(rtn);
    };
    fetchUpdate();

    //Check Version against Github Latest Publish
    /*const fetchGithub = async () => {
      let response = await fetch('https://api.github.com/repos/Ryan-Pell/PackingLoadingSearch/releases/latest');
      let json = await response.json();
      
      if(json['tag_name'] != undefined && checkVersion(version, json['tag_name'].substring(1)) == -1){
        console.log("update required");
        //Find New Version Asset
        let assets = await fetch(json['assets_url']);
        let jsonAssets = await assets.json();
        jsonAssets.forEach(asset => {
          if(asset['content_type'] == 'application/vnd.android.package-archive'){
            newVersionUrl = asset['browser_download_url'];
          }
        })
        
        setRequireUpdate(true);
      } else {
        setRequireUpdate(false);
      }
    };
    fetchGithub();*/

    //Rand Time for Loading
    var length = Math.floor(Math.random() * (2000 - 500 + 1) + 500);
    setTimeout(()=> {setLoading(false)}, length);
  });

  return (
    <SafeAreaView style={{flex: 1}}>
      {(requireUpdate && !isLoading) && <UpdateAvailable />}
      <NavigationContainer>
        <Stack.Navigator>
          {isLoading ? (
            <Stack.Screen name="Splash" component={SplashScreen} options={{headerShown : false}}/>
          ) : (
              <Stack.Screen name="Search" component={SearchPart} options={{ headerTitle: props => <Header {...props}/> }}/>
            )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

function SplashScreen(){
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 300, height: 60 }}>
        <Image source={require('./assets/logo.png')} style={{ flex: 1, width: undefined, height: undefined }} resizeMode='contain' />
      </View>
      <Text style={{ fontWeight:'bold', fontSize: 22 }}>Packing and Loading</Text>
      <Text style={{ fontSize: 14 }}>Standalone Search & Find</Text>
      <ActivityIndicator size='large' color='#004073' style={{ marginTop: 20 }} />
    </View>
  )
}

function Header(){
  return(
    <View style={{ height: 50, flexDirection:'column'}}>
      <Image source={require('./assets/logo.png')} style={{ top: 0, bottom: 0, alignSelf: 'center', width: 220, height: 30, resizeMode: 'contain' }} />
      <Text style={{alignSelf: 'center', fontSize: 16, fontWeight: 'bold'}}>Standalone Search & Find</Text>
    </View>
  );
}

function UpdateAvailable(){
  getUpdate = async() => {
    //Expo Update
    await Updates.fetchUpdateAsync();
    Updates.reloadAsync();
    
    //Github Published
    //Linking.openURL(newVersionUrl)
  };

  return (
    <TouchableHighlight onPress={() => {Linking.openURL(newVersionUrl)}}>
      <View style={{ flexDirection: 'row', backgroundColor: 'red' }}>
        <Icon style={{ alignSelf: 'center', padding: 5, paddingLeft: 15 }} name='alert-circle-outline' size={25} />
        <Text style={{ flex: 1, alignSelf: 'center', fontSize: 16, fontWeight:'bold' }}>Update Available</Text>
      </View>      
    </TouchableHighlight>
  )
}

function NetworkUnavailable(){
  const [getNetworkGood, setNetworkGood] = useState(true);

  React.useEffect(() => {
    const interval = setInterval(async() => {
      const timeout = new Promise((resolve, reject) => { setTimeout(reject, 1000, 'Request Timed Out'); });
      const request = fetch(`${host}/connection`);
      try{
        const response = await Promise.race([timeout, request]);
        setNetworkGood(true);
      }
      catch (error){
        setNetworkGood(false);
      }


    }, 5000);

    return() => {
      clearInterval(interval);
    }
  });

  if (!getNetworkGood) {
    return (
      <View style={{ flexDirection: 'row', backgroundColor: 'orange', borderBottomColor: '#9e9e9e', borderBottomWidth: 1, marginBottom: -1 }}>
        <Icon style={{ alignSelf: 'center', padding: 5, paddingLeft: 15 }} name='alert-circle-outline' size={25} />
        <View style={{ flex: 1, alignSelf: 'center', paddingVertical: 5 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Network Unavailable</Text>
          <Text>Please check network connection.</Text>
        </View>
      </View>
    )
  } else {
    return (
      null
    )
  }
}

class SearchPart extends Component {
  constructor(props){
      super(props); 

      this._submitBtn = this._submitBtn.bind(this);
      this._clearBtn = this._clearBtn.bind(this);
      this.BarCodeMaskDetails = this.BarCodeMaskDetails.bind(this);
      this.BarCodeScanned = this.BarCodeScanned.bind(this);
      this.showBarcodeOverlay = this.showBarcodeOverlay.bind(this);

      this.state = {
          loading: false,
          bomRef: '',
          partNumber: '',
          data: [],
          MaskDetails: [],
          showBarcodeScanner : false,
          BarcodeScanned : false,
      }
  }

  _clearBtn(){
      this.setState({
          partNumber: '',
          data: [],
      });
  }

  async _submitBtn(){
      //Show Loading Animation and Remove 'Old' Data
      this.setState({
          loading: true,
          data: []
      });

      let response = await fetch(`${host}/packing-loading/app/implosion/?part=${this.state.partNumber}&ref=${this.state.bomRef}`, {method:'GET', redirect: 'follow'});
      let json = await response.json();

      if(response.ok){
          this.setState({
              loading: false,
              data: json,
          });            
      } else {
          this.setState({
              loading: false
          });
          Alert.alert('API Response' ,json['response']);
      }
  }

  async showBarcodeOverlay(){
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    
    if(status === 'granted'){
      this.setState({ showBarcodeScanner: true, BarcodeScanned: false });
    } else {
      Alert.alert("Requires Camera Permission", "Please allow camera permissions to use the barcode scanner.");
    }    
  }

  async BarCodeScanned({ type, data, bounds, cornerPoints }){
      var MaskDetails = this.state.MaskDetails;
      var scanned = this.state.BarcodeScanned;
      if (!scanned && bounds.origin.x >= MaskDetails.x && bounds.origin.y >= MaskDetails.y && Math.floor(bounds.size.height + bounds.origin.y) <= Math.floor(MaskDetails.height + MaskDetails.y) && Math.floor(bounds.size.width + bounds.origin.x) <= Math.floor(MaskDetails.width + MaskDetails.x)) {
          Vibration.vibrate();
          this.setState({ BarcodeScanned : true, });
          
          //Find PartNumber from DataMatrix
          let response = await fetch(`${host}/packing-loading/app/worksorder?return=BomReference&number=${data}`);
          if (response.ok) {
              let json = await response.json();
              var key = Object.keys(json)[0];
              this.setState({
                  partNumber: json[key],
                  showBarcodeScanner: false,
              });

          } else {
              this.setState({
                  partNumber: '',
                  showBarcodeScanner: false,
              })
          }
      }
  }

  BarCodeMaskDetails(e){
      this.setState({ MaskDetails: e.nativeEvent.layout });
  }

  render(){
      let render_data = this.state.data.map((data, index) => {
          return(<Item key={index} PartNumber={data['StockCode']} Description={data['Description']} Qty={data['Qty']} UoM={data['UoM']}/>)
      })

      return (
          <View style={{flex:1, backgroundColor: '#e6e6e6', position:'relative'}}>
            <NetworkUnavailable />
            <StatusBar backgroundColor='#002E15' />
              <View style={{alignSelf: 'stretch', padding: 10, backgroundColor: 'white', marginHorizontal: 10, borderColor: '#9e9e9e', borderWidth: 1, borderRadius: 5, backgroundColor: 'white', borderTopColor:'transparent', borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
                <Text style={{paddingBottom: 10, fontStyle: 'italic'}}>Enter BoM Reference for the project and part number that you require the Phase 5 item for.</Text>
                  <View style={{flexDirection:'row', justifyContent:'center', paddingBottom: 10}}>
                    <Text style={{width: 95,textAlignVertical: 'center'}}>BoM Reference:</Text>
                    <View style={style.searchTextInput}>
                      <TextInput style={{marginRight: 25}} autoCapitalize='characters' value={this.state.bomRef} onChangeText={text => this.setState({bomRef: text})} />
                    </View>
                  </View>
                  <View style={{flexDirection:'row', justifyContent:'center'}}>
                      <Text style={{width: 95,textAlignVertical: 'center'}}>Part Number:</Text>
                      <View style={style.searchTextInput}>
                          <TextInput style={{marginRight: 25}} autoCapitalize='characters' value={this.state.partNumber} onChangeText={text => this.setState({partNumber: text})} />
                          <View style={{position: 'absolute', right: 7}}>
                              <TouchableOpacity>
                                  <Icon onPress={async () => await this.showBarcodeOverlay()} size={22} name="barcode-scan" />
                              </TouchableOpacity>
                          </View>     
                          <Overlay isVisible={this.state.showBarcodeScanner} onBackdropPress={() => this.setState({showBarcodeScanner: false})} overlayStyle={{ overflow: "hidden", padding: 0 }}>
                                  <BarCodeScanner
                                      style={{
                                          width: Dimensions.get('window').width - 50,
                                          height: ((Dimensions.get('window').width - 50) / 9) * 16,
                                          alignSelf: 'center',
                                          margin: -5,
                                      }}
                                      onBarCodeScanned={this.BarCodeScanned}>
                                      <Text style={{ position: 'absolute', top: 15, color: 'white', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 3 }}>SCAN PAINT LABEL DATAMATRIX</Text>
                                      <BarcodeMask onLayoutMeasured={this.BarCodeMaskDetails} width={150} height={150} showAnimatedLine={false}></BarcodeMask>
                                  </BarCodeScanner>
                              </Overlay>
                      </View>
                  </View>
                  <View style={{flexDirection:'row-reverse'}}>
                      <Button mode="contained" color='#005E2A' style={style.searchButton} onPress={this._submitBtn}>Search</Button>
                      <Button mode="outlined" color='#002E15' style={style.searchButton} onPress={this._clearBtn}>Clear</Button>
                  </View>
              </View>
              {this.state.loading && <ActivityIndicator animating={true} color={'rgb(0,94,42)'} size={'large'} style={{paddingTop: 20}} />}
              <ScrollView>
                  {render_data}
              </ScrollView>
          </View>
      );
  }
};

class Item extends Component{
  constructor(props){
      super(props);
  }

  render(){
      return(
          <View style={{flex: 1, flexDirection: 'column', minHeight:50, marginVertical: 5, marginHorizontal:10, paddingHorizontal: 10, paddingVertical:2, borderColor: '#9e9e9e', borderWidth: 1, borderRadius: 5, backgroundColor: 'white'}}>
              {this.props.WorksOrder && <View style={{flexDirection: 'row', alignContent:'flex-start'}}>
                  <Paragraph style={style.itemTitle}>Works Order:</Paragraph>
                  <Paragraph style={style.itemDetails}>{this.props.WorksOrder}</Paragraph>
              </View>}
              <View style={{flexDirection: 'row', alignContent:'flex-start'}}>
                  <Paragraph style={style.itemTitle}>Part Number:</Paragraph>
                  <Paragraph style={style.itemDetails}>{this.props.PartNumber}</Paragraph>
              </View>
              <View style={{flexDirection: 'row', alignContent:'flex-start'}}>
                  <Paragraph style={style.itemTitle}>Description:</Paragraph>
                  <Paragraph style={style.itemDetails}>{this.props.Description}</Paragraph>
              </View>
              <View style={{flexDirection: 'row', alignContent:'flex-start'}}>
                  <Paragraph style={style.itemTitle}>Quantity:</Paragraph>
                  <Paragraph style={style.itemDetails}>{`${parseFloat(this.props.Qty).toFixed(2)} ${this.props.UoM}`}</Paragraph>
              </View>
          </View>
      );
  }
}

const style = StyleSheet.create({
  itemTitle: {
      width: 100
  },
  itemDetails: {
      flex: 1,
  },
  searchTextInput: {
      backgroundColor: 'rgb(245,245,245)',
      flex: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#9e9e9e',
      height: 30,
      justifyContent:'center'
  },
  searchButton:{
      marginTop: 10,
      marginLeft: 10,
  }
})