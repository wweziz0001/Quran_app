'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone,
  Layers,
  FolderTree,
  Code,
  Database,
  Play,
  CheckCircle
} from 'lucide-react';

const folderStructure = `
quran-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/quran/app/
│   │   │   │   ├── QuranApplication.kt
│   │   │   │   ├── di/                          # Dependency Injection
│   │   │   │   │   ├── AppModule.kt
│   │   │   │   │   ├── NetworkModule.kt
│   │   │   │   │   ├── DatabaseModule.kt
│   │   │   │   │   └── RepositoryModule.kt
│   │   │   │   ├── data/                        # Data Layer
│   │   │   │   │   ├── remote/
│   │   │   │   │   │   ├── ApiServiceImpl.kt
│   │   │   │   │   │   ├── ApiEndpoints.kt
│   │   │   │   │   │   ├── interceptors/
│   │   │   │   │   │   └── dto/
│   │   │   │   │   │       ├── SurahDto.kt
│   │   │   │   │   │       ├── AyahDto.kt
│   │   │   │   │   │       └── ReciterDto.kt
│   │   │   │   │   ├── local/
│   │   │   │   │   │   ├── QuranDatabase.kt
│   │   │   │   │   │   ├── dao/
│   │   │   │   │   │   │   ├── SurahDao.kt
│   │   │   │   │   │   │   ├── AyahDao.kt
│   │   │   │   │   │   │   └── BookmarkDao.kt
│   │   │   │   │   │   └── entity/
│   │   │   │   │   │       ├── SurahEntity.kt
│   │   │   │   │   │       └── AyahEntity.kt
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   ├── QuranRepositoryImpl.kt
│   │   │   │   │   │   ├── ReciterRepositoryImpl.kt
│   │   │   │   │   │   └── BookmarkRepositoryImpl.kt
│   │   │   │   │   └── mapper/
│   │   │   │   │       └── EntityMappers.kt
│   │   │   │   ├── domain/                      # Domain Layer
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── Surah.kt
│   │   │   │   │   │   ├── Ayah.kt
│   │   │   │   │   │   ├── Reciter.kt
│   │   │   │   │   │   └── Bookmark.kt
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   ├── QuranRepository.kt
│   │   │   │   │   │   └── ReciterRepository.kt
│   │   │   │   │   └── usecase/
│   │   │   │   │       ├── GetSurahsUseCase.kt
│   │   │   │   │       ├── GetAyahsUseCase.kt
│   │   │   │   │       ├── SearchQuranUseCase.kt
│   │   │   │   │       └── PlayAudioUseCase.kt
│   │   │   │   ├── presentation/               # Presentation Layer
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   └── NavigationGraph.kt
│   │   │   │   │   ├── theme/
│   │   │   │   │   │   ├── Color.kt
│   │   │   │   │   │   ├── Theme.kt
│   │   │   │   │   │   └── Type.kt
│   │   │   │   │   ├── home/
│   │   │   │   │   │   ├── HomeScreen.kt
│   │   │   │   │   │   └── HomeViewModel.kt
│   │   │   │   │   ├── surah/
│   │   │   │   │   │   ├── SurahListScreen.kt
│   │   │   │   │   │   ├── SurahDetailScreen.kt
│   │   │   │   │   │   └── SurahViewModel.kt
│   │   │   │   │   ├── reader/
│   │   │   │   │   │   ├── QuranReaderScreen.kt
│   │   │   │   │   │   ├── TafsirModal.kt
│   │   │   │   │   │   └── ReaderViewModel.kt
│   │   │   │   │   ├── audio/
│   │   │   │   │   │   ├── AudioPlayerScreen.kt
│   │   │   │   │   │   ├── PlayerNotification.kt
│   │   │   │   │   │   └── AudioViewModel.kt
│   │   │   │   │   ├── bookmark/
│   │   │   │   │   │   ├── BookmarkScreen.kt
│   │   │   │   │   │   └── BookmarkViewModel.kt
│   │   │   │   │   └── components/
│   │   │   │   │       ├── SurahCard.kt
│   │   │   │   │       ├── AyahItem.kt
│   │   │   │   │       ├── AudioPlayerWidget.kt
│   │   │   │   │       └── LoadingState.kt
│   │   │   │   ├── service/
│   │   │   │   │   ├── AudioPlayerService.kt
│   │   │   │   │   └── DownloadService.kt
│   │   │   │   └── util/
│   │   │   │       ├── Constants.kt
│   │   │   │       └── Extensions.kt
│   │   │   ├── res/
│   │   │   │   ├── drawable/
│   │   │   │   ├── mipmap-*/
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   └── themes.xml
│   │   │   │   └── values-ar/   # Arabic translations
│   │   │   └── AndroidManifest.xml
│   │   ├── test/              # Unit tests
│   │   └── androidTest/       # Instrumentation tests
│   └── build.gradle.kts
├── gradle/
├── build.gradle.kts
└── settings.gradle.kts
`.trim();

const codeExamples = {
  repository: `// QuranRepositoryImpl.kt
class QuranRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val surahDao: SurahDao,
    private val ayahDao: AyahDao,
    private val ioDispatcher: CoroutineDispatcher
) : QuranRepository {

    override fun getSurahs(): Flow<Resource<List<Surah>>> = flow {
        emit(Resource.Loading())
        try {
            // Try to fetch from network
            val remoteSurahs = apiService.getSurahs()
            
            // Cache to local database
            surahDao.insertAll(remoteSurahs.map { it.toEntity() })
            
            // Emit from database for single source of truth
            emitAll(
                surahDao.getAll().map { entities ->
                    Resource.Success(entities.map { it.toDomain() })
                }
            )
        } catch (e: Exception) {
            // On error, try to load from cache
            val cachedSurahs = surahDao.getAll().first()
            if (cachedSurahs.isNotEmpty()) {
                emit(Resource.Success(cachedSurahs.map { it.toDomain() }))
            } else {
                emit(Resource.Error(e.message ?: "Unknown error"))
            }
        }
    }.flowOn(ioDispatcher)

    override suspend fun getAyahsBySurah(surahId: Int): Resource<List<Ayah>> {
        return try {
            val ayahs = apiService.getAyahsBySurah(surahId)
            ayahDao.insertAll(ayahs.map { it.toEntity() })
            Resource.Success(ayahDao.getBySurah(surahId).map { it.toDomain() })
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error")
        }
    }
}`,

  viewModel: `// SurahViewModel.kt
@HiltViewModel
class SurahViewModel @Inject constructor(
    private val getSurahsUseCase: GetSurahsUseCase,
    private val searchQuranUseCase: SearchQuranUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _uiState = MutableStateFlow<SurahUiState>(SurahUiState.Loading)
    val uiState: StateFlow<SurahUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    init {
        loadSurahs()
    }

    private fun loadSurahs() {
        viewModelScope.launch {
            getSurahsUseCase().collect { result ->
                _uiState.value = when (result) {
                    is Resource.Loading -> SurahUiState.Loading
                    is Resource.Success -> SurahUiState.Success(result.data)
                    is Resource.Error -> SurahUiState.Error(result.message)
                }
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
        if (query.length >= 2) {
            searchQuran(query)
        }
    }

    private fun searchQuran(query: String) {
        viewModelScope.launch {
            searchQuranUseCase(query).collect { result ->
                // Handle search results
            }
        }
    }
}

sealed interface SurahUiState {
    object Loading : SurahUiState
    data class Success(val surahs: List<Surah>) : SurahUiState
    data class Error(val message: String) : SurahUiState
}`,

  compose: `// QuranReaderScreen.kt
@Composable
fun QuranReaderScreen(
    surahId: Int,
    viewModel: ReaderViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onShowTafsir: (ayahId: Int) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberLazyListState()
    
    Scaffold(
        topBar = {
            QuranTopBar(
                surahName = (uiState as? ReaderUiState.Success)?.surah?.nameEnglish ?: "",
                onNavigateBack = onNavigateBack
            )
        },
        bottomBar = {
            AudioPlayerWidget(
                isPlaying = viewModel.isPlaying,
                currentAyah = viewModel.currentAyah,
                onPlayPause = { viewModel.togglePlayback() },
                onNext = { viewModel.nextAyah() },
                onPrevious = { viewModel.previousAyah() }
            )
        }
    ) { padding ->
        when (uiState) {
            is ReaderUiState.Loading -> LoadingState()
            is ReaderUiState.Error -> ErrorState(
                message = (uiState as ReaderUiState.Error).message,
                onRetry = { viewModel.loadSurah(surahId) }
            )
            is ReaderUiState.Success -> {
                val data = uiState as ReaderUiState.Success
                LazyColumn(
                    state = scrollState,
                    contentPadding = padding,
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Bismillah header for all surahs except At-Tawbah
                    if (data.surah.number != 9) {
                        item {
                            BismillahHeader()
                        }
                    }
                    
                    items(data.ayahs, key = { it.id }) { ayah ->
                        AyahItem(
                            ayah = ayah,
                            isBookmarked = data.bookmarkedAyahs.contains(ayah.id),
                            isPlaying = viewModel.currentAyah?.id == ayah.id,
                            onBookmark = { viewModel.toggleBookmark(ayah.id) },
                            onPlay = { viewModel.playAyah(ayah) },
                            onTafsir = { onShowTafsir(ayah.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AyahItem(
    ayah: Ayah,
    isBookmarked: Boolean,
    isPlaying: Boolean,
    onBookmark: () -> Unit,
    onPlay: () -> Unit,
    onTafsir: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPlaying) 
                MaterialTheme.colorScheme.primaryContainer 
            else 
                MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Ayah number badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                AyahNumberBadge(ayah.number)
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = onBookmark) {
                        Icon(
                            imageVector = if (isBookmarked) Icons.Filled.Bookmark 
                                          else Icons.Outlined.BookmarkBorder,
                            contentDescription = "Bookmark",
                            tint = if (isBookmarked) 
                                MaterialTheme.colorScheme.primary 
                            else 
                                MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = onPlay) {
                        Icon(Icons.Filled.PlayArrow, "Play")
                    }
                    IconButton(onClick = onTafsir) {
                        Icon(Icons.Filled.MenuBook, "Tafsir")
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Arabic text (RTL)
            Text(
                text = ayah.textArabic,
                style = MaterialTheme.typography.headlineSmall,
                fontFamily = arabicFontFamily,
                textAlign = TextAlign.Right,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}`
};

export function AndroidSection() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Android Application Architecture
          </CardTitle>
          <CardDescription>
            Complete implementation guide for the Kotlin + Jetpack Compose mobile application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium">Clean Architecture</p>
                <p className="text-xs text-muted-foreground">MVVM + Repository</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Jetpack Compose</p>
                <p className="text-xs text-muted-foreground">Modern UI toolkit</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
              <CheckCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Offline-First</p>
                <p className="text-xs text-muted-foreground">Room + Cache</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-500/10">
              <CheckCircle className="h-5 w-5 text-sky-500" />
              <div>
                <p className="font-medium">ExoPlayer</p>
                <p className="text-xs text-muted-foreground">Audio streaming</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="structure" className="space-y-4">
        <TabsList>
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Project Structure
          </TabsTrigger>
          <TabsTrigger value="repository" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Repository
          </TabsTrigger>
          <TabsTrigger value="viewmodel" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            ViewModel
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Compose UI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Project Folder Structure</CardTitle>
              <CardDescription>
                Clean architecture layers with clear separation of concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {folderStructure}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repository">
          <Card>
            <CardHeader>
              <CardTitle>Repository Implementation</CardTitle>
              <CardDescription>
                Data layer with offline-first caching strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.repository}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viewmodel">
          <Card>
            <CardHeader>
              <CardTitle>ViewModel Implementation</CardTitle>
              <CardDescription>
                State management with StateFlow and Use Cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.viewModel}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle>Compose UI Implementation</CardTitle>
              <CardDescription>
                Quran reader screen with RTL Arabic support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto font-mono whitespace-pre">
                {codeExamples.compose}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>App Features</CardTitle>
          <CardDescription>Complete feature list for production release</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Core Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Full Quran with 114 Surahs, 6236 Ayahs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Arabic text with diacritics (Tashkeel)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Multiple translations (English, Urdu, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Tafsir (Ibn Kathir, Al-Qurtubi, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Search across all verses
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Audio Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  25+ Reciters (Qaris)
                </li>
                <li className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  Audio streaming with ExoPlayer
                </li>
                <li className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  Offline download support
                </li>
                <li className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  Background playback
                </li>
                <li className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  Audio quality selection
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">User Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Bookmarks with notes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Reading history
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Last read position
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-500" />
                  Multiple bookmark colors
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">UI/UX</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Material Design 3
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Dark/Light themes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  RTL Arabic support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-sky-500" />
                  Adjustable font sizes
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}