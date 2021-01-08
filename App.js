import React, { Component, useState } from 'react';
import { View, Image, ActivityIndicator, Alert, Dimensions, Text, StyleSheet, Vibration } from 'react-native';
import { ScrollView, TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { Paragraph, Button } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Overlay } from 'react-native-elements';
import { BarCodeScanner } from 'expo-barcode-scanner'
import BarcodeMask from 'react-native-barcode-mask';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'react-native';

const Stack = createStackNavigator();
const host = "http://192.168.17.6/api";;

export default function App() {
  const [isLoading, setLoading] = useState(true);

  React.useEffect(() => {
    var length = Math.floor(Math.random() * (2000 - 500 + 1) + 500);
    setTimeout(()=> {setLoading(false)}, length);
  });



  return (
    <SafeAreaView style={{flex: 1}}>
      
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
        <Image source={require('./src/logo.png')} style={{ flex: 1, width: undefined, height: undefined }} resizeMode='contain' />
      </View>
      <ActivityIndicator size='large' color='#004073' style={{ marginTop: 20 }} />
    </View>
  )
}

function Header(){
  return(
    <View style={{ height: 50, flexDirection:'column'}}>
      <Image source={require('./src/logo.png')} style={{ /*position: 'absolute',*/ top: 0, bottom: 0, alignSelf: 'center', width: 220, height: 30, resizeMode: 'contain' }} />
      <Text style={{alignSelf: 'center', fontSize: 16, fontStyle: 'italic', fontWeight: 'bold'}}>Packing/Loading - Search & Find</Text>
    </View>
  );
}

class SearchPart extends Component {
  constructor(props){
      super(props); 

      this._submitBtn = this._submitBtn.bind(this);
      this._clearBtn = this._clearBtn.bind(this);
      this.BarCodeMaskDetails = this.BarCodeMaskDetails.bind(this);
      this.BarCodeScanned = this.BarCodeScanned.bind(this);

      this.state = {
          loading: false,
          
          partNumber : '',
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
      var salesOrder = await AsyncStorage.getItem('salesOrder');

      //Show Loading Animation and Remove 'Old' Data
      this.setState({
          loading: true,
          data: []
      });

      var headers = new Headers();
      var token = await AsyncStorage.getItem('userToken');
      headers.append("AB-Token", token);
      var requestOptions = { method: 'GET', headers: headers, redirect: 'follow' };
      let response = await fetch(`${global.host}/packing-loading/app/implosion/${salesOrder}?part=${this.state.partNumber}`, requestOptions);
      let json = await response.json();
      console.log(json);

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

  async BarCodeScanned({ type, data, bounds, cornerPoints }){
      var MaskDetails = this.state.MaskDetails;
      var scanned = this.state.BarcodeScanned;
      if (!scanned && bounds.origin.x >= MaskDetails.x && bounds.origin.y >= MaskDetails.y && Math.floor(bounds.size.height + bounds.origin.y) <= Math.floor(MaskDetails.height + MaskDetails.y) && Math.floor(bounds.size.width + bounds.origin.x) <= Math.floor(MaskDetails.width + MaskDetails.x)) {
          Vibration.vibrate();
          this.setState({ BarcodeScanned : true, });
          
          //Find PartNumber from DataMatrix
          var headers = new Headers();
          var token = await AsyncStorage.getItem('userToken');
          headers.append("AB-Token", token);
          var requestOptions = { method: 'GET', headers: headers, redirect: 'follow' };
          let response = await fetch(`${global.host}/packing-loading/app/worksorder?return=BomReference&number=${data}`, requestOptions);
          if (response.ok) {
              let json = await response.json();
              var key = Object.keys(json)[0];
              this.setState({
                  partNumber: json[key],
                  showBarcodeScanner: false,
              });

              //Run Search on Successful Scan
              this._submitBtn();
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
            <StatusBar backgroundColor='#002E15' />
              <View style={{alignSelf: 'stretch', padding: 10, backgroundColor: 'white', marginHorizontal: 10, borderColor: '#9e9e9e', borderWidth: 1, borderRadius: 5, backgroundColor: 'white', borderTopColor:'transparent', borderTopLeftRadius: 0, borderTopRightRadius: 0}}>
                  <View style={{flexDirection:'row', justifyContent:'center', paddingBottom: 10}}>
                    <Text style={{width: 95,textAlignVertical: 'center'}}>BoM Reference:</Text>
                    <View style={style.searchTextInput}>
                      <TextInput style={{marginRight: 25}} autoCapitalize='characters' value={this.state.partNumber} onChangeText={text => this.setState({partNumber: text})} />
                    </View>
                  </View>
                  <View style={{flexDirection:'row', justifyContent:'center'}}>
                      <Text style={{width: 95,textAlignVertical: 'center'}}>Part Number:</Text>
                      <View style={style.searchTextInput}>
                          <TextInput style={{marginRight: 25}} autoCapitalize='characters' value={this.state.partNumber} onChangeText={text => this.setState({partNumber: text})} />
                          <View style={{position: 'absolute', right: 7}}>
                              <TouchableOpacity>
                                  <Icon onPress={() => this.setState({ showBarcodeScanner: true, BarcodeScanned: false })} size={22} name="barcode-scan" />
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